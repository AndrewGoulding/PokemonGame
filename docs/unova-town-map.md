# Unova Town Map

The native Town Map now includes Unova, opens on the current region, and
locates all imported maps, including dungeon floors, Centers, activity
rooms and scripted travel destinations. Previously visited Unova towns are
available on this page from other regions. R switches regions; arrows move
the cursor; Fly selects only destinations already visited in the saved Unova
travel record. Existing saves retain that record and migrate their visited
sections without requiring a second visit to every town.

`tools/lib/unova-town-map.js` runs from the Unova importer. Names and map
membership come from pokebw2's `res/field/zones` and `res/field/places`.
Centers and postgame Fly records supply the existing safe landing locations.
The 240×160 regional image is an authored schematic using the game's small
map grid, not a rip of the original DS map. The source checkout exposes the
Town Map loader but does not include its archive-84 graphics or archive-85
position table. Squares and connecting lines describe regional geography;
they do not add travel shortcuts or reproduce every turn in a route.

Unova sections have a `UNOVA_` prefix, so Route 1 and Victory Road do not
replace Kanto's sections. The shared section table also supplies Trainer Memo
place names and visited dungeon icons. The Pokédex habitat browser has a
Unova page and reads the saved version and current season, including dark
grass, rustling grass and rippling water encounters, rather than displaying
whichever version last populated a live map.

Validation: `tests/unova-town-map-test.js` checks every location, section
isolation, old-save migration and every Fly landing. The browser scenario
`tests/browser/unova-town-map.js` checks the actual cursor, visited Fly
selection, rejection of an unvisited town, dungeon-floor location and region
switching.
