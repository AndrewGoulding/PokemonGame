# Unova optional interiors and services

Fourteen new source interiors and the existing secluded garden are now mapped through native doors, ferry/stair
entrances and the existing sewer layout. The areas include Game Freak’s office,
Castelia’s Badge Office and ferry cabin, the sewer hideout and secluded garden, Driftveil
Market, Shopping Mall Nine’s stockroom, the Humilau trade house, and houses in
Lacunosa, Mistralton, Nuvema, Striaton, Virbank and both Route 4 house layouts.
The existing Humilau Mantine/Tangrowth trader moves into its source house.
The garden now uses its actual `castelia_city_31` event bank, while Castelia’s
street events use `castelia_city`; its encounter table is retained explicitly.
Existing pickup/win flags remain valid after this source-bank correction.
New street houses use the same native building art as the region and preserve
connected entrances and approaches. Field pickups retain source scripts/flags.

The source is pokebw2 commit `588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`.
Room bank names are stored in `interiors.rooms`; their scripts and text are
included in the normal provenance. Geometry is an authored 2D projection.
The two Route 4 houses remain available in this offline adaptation; exact
version-dependent exterior geometry remains part of the separate map audit.
Source flavor text does not claim to execute every DS house script; further
house gifts and dialogue conditions remain on the completion checklist.

Morimoto and Nishino can each be challenged once per game day, with their
source early and post-League parties. Early Morimoto uses the three level-14
monkeys and Nishino uses level-16 Clefairy. Postgame parties have six members at
76–78. Winning consumes the daily opportunity; cancelling or losing permits
another attempt. One record applies across the early/late team change. Battle
portraits use Morimoto’s Veteran and Nishino’s Hiker appearance. The Director
checks the source non-event regional/national collections and presents saved
diplomas; existing Juniper research and rewards continue to work.

Surf opens the the sewer hideout and secluded garden. Ricky, Jean-Paul and Tina must be
beaten in order with their source level-32/33 teams. Losses and repeat visits
do not advance the quest. The third win awards Castelia Boss, matching
`castelia_city_32.s:MedalGive 95`. Each battle is started at its NPC in this
local version of the crew’s event.

Driftveil Market offers source marts 15 and 16 (herbal medicine and incenses),
Moomoo Milk singly or by the dozen, and the one-time Expert Belt for showing a
level-30 Pokémon. Purchases validate funds and capacity before charging and
record successful purchases/spending. Source item prices are stored in tens
of Pokédollars (`item.schema.json`, `PML_ItemGetParam`); conversion multiplies
by ten. This also corrects imported Avenue/Services/Funfest/Field custom-item
values, including RageCandyBar and Odd Keystone, while named collector prices
and Pass Orb/BP costs keep their own source units.

Shopping Mall Nine’s boxes implement the six Rotom forms and signature moves
from `global_10315.s`. A full move set asks what to forget; cancelling leaves
the record untouched. Changing forms removes the old appliance move, retains
other moves and PP, and preserves identity, held item, status and HP without
healing. Returning to normal with no remaining move restores Thunder Shock.
The form and learned move survive the ordinary save.

Mistralton’s TM collector checks the actual source set of 95 TM moves, mapped
to the shared engine’s machine IDs. Other games’ TM numbers cannot substitute
for those source moves. At 10/20/35/50/70/95 distinct owned TMs, one HP Up is
available per milestone. Backlogged milestones can be claimed on subsequent
visits. Machines are retained, and a full Bag leaves the reward unclaimed.
This follows the thresholds and item 45 in `mistralton_city_4.s`.

Validation: the model test covers early/late daily limits, ordered crew battles
and Surf/loss/repeat gates, Castelia Boss, exact source prices and atomic bulk
purchases, Expert Belt, Rotom cancellation/forms/moves/PP/state, all 95 TMs and
six capacity-safe milestone rewards, and saves. The general topology test
checks all 313 maps; the field test checks 448 positions and 440 unique flags.
The browser test uses native market, form and move menus, claims a TM reward,
fights postgame Morimoto and the three crew members, and reloads saved rewards.
