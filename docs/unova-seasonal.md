# Deerling and Sawsbuck seasons

Deerling and Sawsbuck now have spring, summer, autumn and winter cosmetic
forms. `src/ov012/season_form.c` maps seasons to source forms 0–3 and updates
the party; `src/system/season.c` defines the repeating monthly cycle. This
game retains its existing clock adaptation of one season per 30 game days.

Party Pokémon, including Eggs, update while traveling in Unova. PC Pokémon
retain their stored form until returned to the party. Wild encounters and
source trainer teams use the current Unova season. Leaving Unova preserves
the stored form, so a winter Sawsbuck does not silently return to spring in
Kanto. Maternal form inheritance and evolution preserve that appearance.
Season changes never alter HP, status, moves, PP, stats, abilities or items.

The importer copies each alternate form's front/back art, normal/shiny
palettes and two-frame party icon from `res/pokemon/{deerling,sawsbuck}/form_*`.
The native battle and party views use the ordinary species with a cosmetic
form suffix. No additional Pokédex species or altered battle types are added.
Seen seasons are stored separately in the Unova save state.

BW2 does not supply walking-party sheets. Alternate-form followers therefore
use the original seasonal two-frame icons on the game's nine-frame follower
sheet, matching the existing grotto display technique. This keeps the correct
coat and antlers visible; it is not an original DS directional walking sprite.
Seasonal overworld route artwork remains a separate map-coverage task.

Validation: `tests/unova-seasonal-test.js` covers the four seasons, party/PC
isolation, wild forms, unchanged battle attributes, inherited Eggs, evolution,
asset coverage, battle sets and saved records. The browser test checks native
front/back winter battle sprites, summer followers, travel into Kanto and a
save reload.
