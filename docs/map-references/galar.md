# Galar map references

Plans: `tools/plans/galar.js` (towns, the Isle of Armor and Crown Tundra areas), `tools/plans/galar-routes.js`
(routes and the Wild Area).

Galar is a 3D region, so there are no tile maps. The references used are pokewiki.de's guidebook-style overhead
maps (one per town and route of the main game), its in-game screenshots (the only pictures it has for the Isle of
Armor and the Crown Tundra) and its region-map art. They were compared for arrangement, landmarks, terrain and
colours.

Nearly every map here is built on a fixed frame that cannot move: towns have a gate at about 19,4, one at about
4,17 and a door at about 27,10 (or 19,28 / 19,3 / 30,24 / 10,25), plus rim openings in the middle of each side;
routes have a gate at each end of a north-south or east-west run. So a town's Center, Stadium and exits usually
sit on different sides from the real ones. "corrected" below means the terrain, landmarks, building style or
colours were changed to agree with the reference as far as that frame allows; what still differs is said in the
notes. A verdict of "matches" on a screenshot-only reference means ground, colours and the landmarks visible in
that one picture agree, nothing more.

## Towns and areas (`galar.js`)

| Map | Reference | Verdict | Notes |
| --- | --- | --- | --- |
| GalarPostwick | https://www.pokewiki.de/Furlongham | corrected | Added the walled stream with its bridge that separates your house and the Weald from the rest; fields changed to the patchwork on the map (Wooloo pasture, ploughed red earth, grain); Hop's house is now a big red-roofed farmhouse (was a log cabin) with the blue battle court beside it. Still differs: your house is north and Hop's west (really west and east), and the Route 1 lane leaves through a gate in a wall because that exit is a door. |
| GalarWedgehurst | https://www.pokewiki.de/Brassbury | corrected | Removed the Stadium-like hall (Wedgehurst has none) and the stream through the middle; the river now runs round two sides and both roads out cross it; station, yard and railway moved to the south-west corner (were along the north edge); houses given red-brick roofs; Route 2 leaves by a gate. Still differs: Route 1 is at the north instead of the south, the lab is west instead of east. |
| GalarTurffield | https://www.pokewiki.de/Turffield | corrected | Removed the invented stone circle: standing stones are now scattered along the lanes; ploughed red-earth fields put beside the Stadium; river added down the east side with the bridge on the road towards Route 5. Geoglyph hill kept in the south-west. Still differs: Route 4 enters from the north (really south), the Stadium is north-east rather than centred, the lanes are straight not concentric. |
| GalarHulbury | https://www.pokewiki.de/Keelton , https://www.pokewiki.de/Hulbury_Stadium | corrected | Harbour moved from the south to the east and north-east; the Stadium now stands on its own platform over the water at the head of a causeway and is tinted blue-lilac; the long quay runs east to the lighthouse on a grass headland (was at the end of a south pier); market moved from the north-west to an earth square in the south-west; red-roofed terrace on the west side; boats along the south quay. Still differs: Route 5 enters from the north (really west). |
| GalarMotostoke | https://www.pokewiki.de/Engine_City | corrected | Mills and tenements tinted red brick (were grey office blocks); dock water added down the west side to go with the canal. Wild Area gate in the south and a Center at the top agree with the map. Still differs: the Stadium is south-east (really north-east) and the Route 3 arch south-west (really north-west); the upper and lower levels are not shown. |
| GalarHammerlocke | https://www.pokewiki.de/Claw_City | corrected | Ground changed from pale paving to grey stone. South wall and gate to the Wild Area, the vault at the west end and the drawbridge before the Stadium agree. Still differs: the real city is one long east-west street with the Stadium in the middle of the north side; here the Stadium is south-east and Route 6 leaves north. |
| GalarHammerlockeGate | https://www.pokewiki.de/Claw_City | differs | A connector the game here adds between Hammerlocke and the Route 9 tunnel; the reference has no such separate place. Castle wall, towers and banners follow the city screenshot. Not changed. |
| GalarStowOnSide | https://www.pokewiki.de/Passbeck | corrected | Houses tinted sandstone with terracotta roofs (were green-roofed). Mural at the top north-west with the long stair down, and the market below, agree. Still differs: the real Stadium fills the middle north with the market south of it; here it is south-east, and the Center is north. |
| GalarBallonlea | https://www.pokewiki.de/Fairballey | differs | Dark glade lit by coloured mushrooms, timbered purple houses and the Glimwood exit in the south agree. The real Stadium is at the far north end of the one path and the Center near the entrance; here the Center is north and the Stadium south-east (fixed doors). The door to Route 7 has no counterpart on the map. Not changed. |
| GalarCirchester | https://www.pokewiki.de/Circhester | corrected | The Hero's Bath is now a long rectangular pool inside a colonnade on a brick terrace (was an oval ringed with columns); streets changed to red-brown brick; the round plaza with its pool added inside the south entrance. Still differs: the bath is north-west instead of on the central axis, the Stadium is south-east (really far north), the Route 9 gate south-west (really south-east). |
| GalarSpikemuth | https://www.pokewiki.de/Spikeford | differs | The real town is one long east-west arcade from the shutter to the stage. Here the arcade runs north-south and is crossed by a second street, because the side openings of the frame are fixed (taking the cross street out made the builder cut its own way through). Dark shopfronts, neon and strung lights agree. Not changed. |
| GalarWyndonCity | https://www.pokewiki.de/Score_City | corrected | Added the round red-brick plaza with its fountain just inside the south entrance and more lawn. Monorail and glass towers agree. Still differs: Rose Tower is south-west and the Stadium south-east (really north-west and north-east). |
| GalarWyndonWest | https://www.pokewiki.de/Score_City | differs | A second Wyndon map the game here adds. Its pieces (observation wheel, hotel, monorail, river with bridge, snow towards Route 10) are all on the reference, but as parts of one city, in other positions. Not changed. |
| GalarRoseTowerTop | https://www.pokewiki.de/Rose_Tower | no reference found | The page only has the tower's entrance from outside; no picture of the roof. |
| GalarHulburyStadium | https://www.pokewiki.de/Hulbury_Stadium | no reference found | The page shows the outside of the Stadium and its lobby, not the Gym floor. Left as it was. |
| GalarArmorStation | https://www.pokewiki.de/Armor_Station | corrected | Station redrawn as the red-brick building with a clock tower (was white with a blue roof); ground changed from all sand to grass with cliffs behind and the beach kept at the shore; the railway line and train outside were removed (not in the picture). Screenshot only: arrangement not checked. |
| GalarFieldsOfHonor | https://www.pokewiki.de/Fields_of_Honor | matches | Screenshot only: grass running down to a wide beach and the sea, as built. |
| GalarMasterDojo | https://www.pokewiki.de/Master_Dojo | matches | Screenshot only: yellow-roofed hall on grass, as built. Region map puts the battle court beside it, as here. |
| GalarSoothingWetlands | https://www.pokewiki.de/Soothing_Wetlands | corrected | Ground changed from brown marsh to bright green grass with reedy margins round the pools and flowers, as the screenshot shows. Screenshot only: arrangement not checked. |
| GalarChallengeBeach | https://www.pokewiki.de/Challenge_Beach | matches | Screenshot only: pale sand and sea under grassy cliffs. Region map has the Tower of Waters on the west shore, as here. |
| GalarTrainingLowlands | https://www.pokewiki.de/Training_Lowlands | matches | Screenshot only: green meadow between rock walls, as built. |
| GalarFreezington | https://www.pokewiki.de/Freezedale | corrected | Houses redrawn as half-timbered cottages with snow on the roofs (were dark log cabins). Fenced crop plots, pines and snow agree. Screenshot only; in it the plots are in the middle of the village, here the statue square is. |
| GalarFrostpointField | https://www.pokewiki.de/Frostpoint_Field | matches | Screenshot only: snowfield, snow-laden pines, rock arch. The fallen pillars could not be checked. |
| GalarGiantBed | https://www.pokewiki.de/Giant%27s_Bed | corrected | Border and groves changed from broadleaf trees to firs, as in the screenshot. River, cemetery in the west and the Dyna Tree to the south agree with the region map. |
| GalarSnowslideSlope | https://www.pokewiki.de/Snowslide_Slope | matches | Screenshot only: open snow slope with a few trees. |
| GalarGiantFoot | https://www.pokewiki.de/Giant%27s_Foot | differs | Grass, firs and rail fences in the screenshot agree with the ground here. The Split-Decision Ruins really stand at Three-Point Pass, not in Giant's Foot; they stay because the person who triggers them is fixed here. The footprint-shaped tarn could not be checked. Not changed. |

## Routes and the Wild Area (`galar-routes.js`)

| Map | Reference | Verdict | Notes |
| --- | --- | --- | --- |
| GalarHopHouse | https://www.pokewiki.de/Furlongham | corrected | Battle court changed from brown clay to the blue court on the map. Red-roofed farmhouse and Wooloo agree. This lane is a separate map here; in the game it is part of Postwick. |
| GalarSlumberingWeald | https://www.pokewiki.de/Slumbering_Weald | matches | Winding path through black wood with a stream beside it and fog, as on the map. |
| GalarSlumberingDepths | https://www.pokewiki.de/Slumbering_Weald | matches | The map's northern part: the path ending at the stone arch in the lake. |
| GalarRoute1 | https://www.pokewiki.de/Route_1_(Galar) | corrected | Path redrawn: a straight lane up the west side with a loop out east through the tall grass and back (was one winding lane between two fenced Wooloo pastures, which the map does not have). |
| GalarRoute2 | https://www.pokewiki.de/Route_2_(Galar) | corrected | Lake moved to the west with its islet and an outflow south under the road; the house now stands above the east shore; blue battle court added on the lawn; the plank bridge across the lake removed (invented). Still differs: the house door is fixed at the top centre, so the lake cannot lie north-west of it as on the map. |
| GalarWildAreaSouth | https://www.pokewiki.de/Wild_Area | corrected | Removed the Nursery (it is in Bridge Field) and put the Giant's Seat crag in the south-east. Motostoke's wall and stair in the north, Lake Axewell with its island in the west and Lake Miloch in the east agree. The watchtower is further south than on the map. |
| GalarWildAreaNorth | https://www.pokewiki.de/Wild_Area | corrected | Added the Nursery at the east end of Bridge Field; the western crag is the Giant's Cap (was labelled Giant's Seat). Viaduct, river, Dusty Bowl, Lake of Outrage in the north-west and Hammerlocke's wall agree. Much compressed: the real area has two viaducts and several more zones. |
| GalarRoute3 | https://www.pokewiki.de/Route_3_(Galar) | corrected | Path changed from grey gravel to the tan earth on the map; the white works building at the top left removed (crags there on the map). The real route runs east-west; here south to north. One factory with stacks kept by the mine end; the map shows none on the route itself. |
| GalarRoute4 | https://www.pokewiki.de/Route_4_(Galar) | corrected | The red barn replaced by a third field (the map has fields and no building). Golden fields between walls, the tractor and the lane north to Turffield agree. The vegetable plots in the south-west are not on the map (cliffs there). |
| GalarRoute5 | https://www.pokewiki.de/Route_5_(Galar) | corrected | The bridge crossed a river: it now strides over a green valley with no water, on the way to Hulbury, with the Nursery before it; the side loop round a pond with a campsite added. Still differs: the real bridge runs east-west and is much longer; here it runs north because the Hulbury gate is north. The west branch to the mine is the game's own. |
| GalarMotostokeOutskirts | https://www.pokewiki.de/Motostoke_Outskirts | corrected | Ground changed from grey mining gravel to rough grass and crags; the pit-head frames and the long rail line removed (not on the map), two ore carts kept at the mine mouth. Still differs: the long brick bridge from Motostoke is missing; city stacks stand at the north end instead. |
| GalarRoute6 | https://www.pokewiki.de/Route_6_(Galar) | matches | Stepped desert ledges climbed by ladders, the camp, and the great Diglett carving at the top. The real rock is a deeper red-orange than the sand here. |
| GalarGlimwoodTangle | https://www.pokewiki.de/Glimwood_Tangle | matches | Dark wood, looping path, glowing mushrooms in pink, blue and gold. |
| GalarStowOutskirts | https://www.pokewiki.de/Passbeck | no reference found | A connector the game here adds between Stow-on-Side and the Glimwood Tangle; on the town map the forest opens straight off the Stadium terrace. |
| GalarRoute7 | https://www.pokewiki.de/Route_7_(Galar) | corrected | Removed the brook (the map shows a dry gorge, no water). Grass downs and the stone railway bridge agree; the real bridge is at the east end only. |
| GalarRoute8 | https://www.pokewiki.de/Route_8_(Galar) | matches | Sandstone ruin maze in the south, snow of Steamdrift Way in the north. |
| GalarRoute9 | https://www.pokewiki.de/Route_9_(Galar) | matches | Circhester Bay: dark water full of ice floes between snowy islets, Spikemuth's shutter at the far end. The boardwalks stand in for the water bike; the grassy Outer Spikemuth strip is not drawn. |
| GalarRoute9Tunnel | https://www.pokewiki.de/Route_9_Tunnel | differs | The reference is a plain road tunnel with crash barriers. Here the tunnel mouth is at the top and the rest is a snowy road outside, which the game does not have. Not changed. |
| GalarRoute10 | https://www.pokewiki.de/Route_10_(Galar) | matches | Snow path climbing north to Wyndon's wall, the station building at the south end. |
| GalarForestFocus | https://www.pokewiki.de/Forest_of_Focus | matches | Screenshot only: thick wood, a stream and plank bridges. |
| GalarWorkoutSea | https://www.pokewiki.de/Workout_Sea | matches | Screenshot only: open sea with small sand and grass islets. |
| GalarTunnelTop | https://www.pokewiki.de/Tunnel_to_the_Top | corrected | Floor changed from blue ice to bare earth in a brown rock cave, as the screenshot shows; ice sheets and crystals kept only near the upper end. |
| GalarCrownShrine | https://www.pokewiki.de/Crown_Shrine | matches | Screenshot only: stone-paved stair between posts under falling snow. The real trees are bare; firs here. |
