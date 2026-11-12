# Galar — unified Pokémon Sword / Shield opening

The Galar campaign uses **one shared storyline** under `player.flags.galar`. There is
no Sword/Shield version selector. Your existing party, storage, Pokédex, items and
trainer identity are shared with the other regions; Galar progress, visited
areas, Gym badges, healing points and return travel are stored separately.

## Starting the Galar adventure

In Sinnoh's **Fight Area**, speak to the Galar researcher to travel to your
home in **Postwick**. Meet Hop, enter his house and choose Grookey, Scorbunny
or Sobble from Champion Leon. Hop chooses the starter at a type disadvantage.
Battle Hop, investigate the mysterious wolves of Slumbering Weald, then
visit Sonia and Professor Magnolia to receive Gym Challenge endorsement.

The initial chapter contains **25 connected maps**:

- Postwick, your home, Hop's house, Slumbering Weald, Route 1
- Wedgehurst, Sonia's Lab, Route 2, Professor Magnolia's House
- Rolling Fields (Wild Area), Motostoke, Pokémon Center and Stadium
- Route 3, Galar Mine, Route 4, Turffield, Center and Stadium
- Route 5, Hulbury, Center and Stadium, Galar Mine No. 2, Motostoke Outskirts

Story gates require defeating Hop, registering at Motostoke Stadium, and
defeating Bede in the first mine. Three adapted Galar Gym Challenges are
playable: **Milo / Grass Badge**, **Nessa / Water Badge**, and
**Kabu / Fire Badge**. Each Gym has staged trainer battles before its
Leader, with progress saved after every victory. Rival and Gym battles can
be retried after a loss. Galar's level cap rises with story milestones,
reaching **45** after Kabu.

The Galar Town Map shows the current area, interior locations, and
visited-only Fly destinations at Postwick, Wedgehurst, Motostoke, Turffield
and Hulbury. The home return researcher lets you go back to the Fight Area
and later resume your Galar adventure where you left off.

## Scope and limitations

Maps reuse existing Kalos 2D layouts as **temporary visual placeholders**,
with newly authored connections, encounters, safe NPC placements and region
coordinates. The Wild Area uses a common exploration/encounter pool, not a
3D open-world simulation. Leon, Rose and the Gym Challenge use original
shortened dialogue and native trainer battles; Dynamax is acknowledged in
the story but there is no special stadium Dynamax phase in this chapter.
The first three Gyms are implemented; Hammerlocke, the remaining Gyms,
Darkest Day, Champion Cup, Isle of Armor and Crown Tundra are not yet built.

Regression: `node tests/galar-test.js`, included in `npm test`.

## Midgame: Hammerlocke to eight badges

After Kabu’s Fire Badge, return through Motostoke Outskirts into the
northern Wild Area and reach Hammerlocke. The expanded chapter adds
**24 connected maps**, bringing Galar to **49 maps**: northern Wild Area,
Hammerlocke and Stadium, Route 6, Stow-on-Side and Stadium, Glimwood Tangle,
Ballonlea and Stadium, Routes 7 and 8, Circhester and Stadium, Route 9,
Spikemuth and Gym, the Route 9 Tunnel, Hammerlocke Gate and five new
Pokémon Centers.

The story includes Hop in Hammerlocke and on Route 7, Team Yell on Routes
6 and 9, Bede’s Stow-on-Side encounter, Marnie in Spikemuth, and the
remaining five Gym Challenges. To keep Sword and Shield content merged,
**both Bea and Allister** are defeated before receiving the Stow-on-Side
Badge, and **both Gordie and Melony** before receiving the Circhester Badge.
Opal awards the Fairy Badge, Piers the Dark Badge, and Raihan the Dragon
Badge. The native battle engine adapts the challenges into staged trainer
battles and does not recreate 3D Stadium puzzles or Dynamax battles.

Each Gym stores individual trainer and leader victories, allowing retries
without repeating cleared fights. The Galar level cap rises to **80** after
Raihan. The Town Map now covers all 49 maps, including centers and Stadiums,
with visited-only Fly destinations for Hammerlocke, Stow-on-Side, Ballonlea,
Circhester and Spikemuth. Existing Galar and Alola saves are preserved.

The Champion Cup, Wyndon, Darkest Day, Zacian and Zamazenta finale, Isle of
Armor and Crown Tundra are planned subsequent chapters, not part of this
release.

Regression: `node tests/galar-mid-test.js`, included in `npm test`.

## Wyndon, the Champion Cup and the Darkest Day

After earning Raihan's Dragon Badge, travel north from Hammerlocke Stadium
through Galar Route 10 to Wyndon. The final chapter adds **13 connected
maps**, bringing the unified Sword/Shield campaign to **62 Galar maps**:
Route 10, Wyndon Approach, Wyndon Hotel, Wyndon City, Pokémon Center and
Stadium, Rose Tower and its summit, the Energy Plant, Eternatus Chamber,
Battle Tower, Slumbering Weald Depths and the Ancient Hero Shrine.

Register for the Champion Cup and battle Marnie, then Hop. Investigate Rose
Tower, defeat Macro Cosmos security and Oleana, then enter a combined-finals
bracket against Bede, Nessa, **both Bea and Allister**, and Raihan. The
Sword- and Shield-exclusive opponents remain available in the same save.
After the finalists, confront Chairman Rose at the Energy Plant, defeat
Eternatus, and face Champion Leon in Wyndon Stadium. Becoming Champion
persists the Galar title and increases the Galar level cap to **100**.

The postgame opens Slumbering Weald Depths, Hop's rematch, Sordward and
Shielbert, and separate one-time encounters with both Zacian and Zamazenta.
The Wyndon Battle Tower offers repeatable trainer battles, a current streak
and a best-streak record. Champion Cup title-defense rematches keep the
original Championship record and increment the number of Galar titles.
The Galar Town Map now includes every one of the 62 areas and a
visited-only Wyndon Fly destination. Route 10, Wyndon, and the postgame
are appropriately gated behind story milestones.

**Adaptation limits:** Stadiums, Rose Tower and the Energy Plant reuse
existing 2D layouts. Cup finals are sequential native trainer battles;
the original Sword/Shield cutscenes, Dynamax raids, real-time 3D weather,
cinematic Eternamax sequence and full catching mechanics are not reproduced.
The Zacian/Zamazenta events are one-time battles, not guaranteed captures.
The Isle of Armor and Crown Tundra expansion campaigns remain unimplemented.

Regression: `node tests/galar-finale-test.js` (also in `npm test`).
