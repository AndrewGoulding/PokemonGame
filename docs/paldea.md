# Paldea — unified Scarlet / Violet opening

This is the first playable Paldea chapter and the beginning of the final region. It is **not** the complete Scarlet/Violet campaign. The game uses one shared Scarlet/Violet storyline under `player.flags.paldea` and retains the same Pokémon party, PC, items, Pokédex, and trainer identity as the other regions.

## Starting the adventure

Speak to the **Paldea researcher in Sinnoh's Fight Area** to travel to **Cabo Poco**. Director Clavell and Nemona offer Sprigatito, Fuecoco or Quaxly as a one-time starter gift. Nemona chooses the starter weak to yours. The prologue continues through Poco Path, Inlet Grotto, the lighthouse, Los Platos and South Province to Mesagoza and the academy. Start the Treasure Hunt before travelling west to Cortondo and challenging Gym Leader Katy for the Bug Badge.

The opening chapter contains **13 connected 2D areas**:

- Cabo Poco home and town, Poco Path, Inlet Grotto, lighthouse
- Los Platos, Pokémon Center, South Province (Area One)
- Mesagoza, Academy and Pokémon Center
- Cortondo and Cortondo Gym

The maps use existing Kalos 2D layouts as temporary collision/terrain placeholders with Paldea-specific area names, NPCs, encounters, warps, and progression rules. There is no seamless 3D open world yet.

## Existing engine features reused

Gen 9 Pokémon, moves, items, and the battle engine's Terastallization mechanics are already shared across the game. Paldea-specific Pokémon are found in early encounter pools, and the native trainer engine handles Nemona, the Cortondo Gym trainer, and Katy. A Paldea level cap rises from 7 to 30 through the chapter.

There is a dedicated regional Town Map with visited-only Fly spots at Cabo Poco, Los Platos, Mesagoza, and Cortondo. Paldea progress, one-time gift, trainer victories, resume location, and Badge are saved independently of the other regions. The home NPC returns the player to the Fight Area and enables later resumption.

## Future chapters

The main remaining expansion work is the rest of Victory Road and its Gyms, Path of Legends and Titan Pokémon, Team Star and Starfall Street, Area Zero and The Way Home, followed by The Teal Mask and The Indigo Disk DLC. Those are **not** included in this opening update.

Regression: `node tests/paldea-test.js` (also included in `npm test`).

## Victory Road continuation: Artazon and Cascarrafa

The second chapter adds **8 maps**, bringing Paldea to **21 locations**. From
South Province, follow East Province (Area One) to Artazon, its Pokémon Center,
and Brassius's Grass Gym. From Cortondo, reach West Province (Area One) and
Cascarrafa, its Pokémon Center, and Kofu's Water Gym. The academy's Treasure
Hunt unlocks the eastern branch; Katy's Badge unlocks the western route, and
Brassius's victory unlocks Cascarrafa. These level gates are specific to this
2D adaptation, not Scarlet/Violet's original open-world restrictions.

Both Gyms have separately saved trainer challenges and Leader victories, with
losses retryable without erasing completed trainers. Brassius awards the Grass
Badge, and Kofu the Water Badge; Paldea's level cap reaches **45** after Kofu.
The Town Map adds Artazon and Cascarrafa Fly locations, and their Pokémon
Centers become safe healing and respawn points. East/West Province encounters
and optional trainer challenges are included. All progress shares the existing
Paldea save flags and works alongside the earlier Cabo Poco–Cortondo story.

Regression: `node tests/paldea-test.js`, run via `npm test`.

## Path of Legends — Stony Cliff and Open Sky

Four 2D areas bring Paldea to **25 connected maps**. From East Province, climb
Stony Cliff and enter the Herba Mystica cave; from West Province, follow the
Open Sky Trail to Bombirdier's summit. The paths branch from the existing
map network and are unlocked through the academy's Treasure Hunt independently
of Gym victories. The second Titan area opens after the Stony Cliff challenge.

**Klawf:** Defeat the Stony Cliff Titan, follow it into the cave, then win a
second battle with Arven's help. The Sweet Herba Mystica milestone unlocks
the recorded dash upgrade. **Bombirdier:** Defeat the Open Sky Titan in two
stages to discover Bitter Herba Mystica and record the swim upgrade.
Losing either round leaves that round available for retry. Completed Titans
cannot be repeatedly battled for story rewards, and progress survives saves.

The ride upgrades are **saved story milestones**; they do not yet add physical
sprint or swim controls to this browser game's 2D movement engine. Titan fights
use ordinary trainer-style combat (no cooperative double-battle cinematic),
and the cave/nest are built on the game's existing 2D layouts.

The Paldea regression now checks both Titans, retry behavior, repeated
interactions, saved story flags, and map connectivity.

## Starfall Street — Segin and Schedar squads

Six additional 2D maps bring the region to **31 connected locations**. From
South Province, travel to the Segin Squad road, base and garage; from East
Province, reach Schedar Squad's road, base and garage. Entry to both roads
requires the Academy Treasure Hunt, independent of Gym Badges and Titan
progress. Each garage requires completing its crew's base challenge.

**Segin (Dark):** Meet Cassiopeia, defeat the gatekeeper and three saved
trainer waves, then challenge Giacomo and his Starmobile. **Schedar (Fire):**
Defeat the corresponding base challenge, then battle Mela and her Starmobile.
Wave wins persist through saves, so defeat never erases earlier victories.
Boss battles have separate stage flags. Crew victories are recorded only once
under `player.flags.paldea.starfallCrews`, and revisiting a boss does not
repeat battles or duplicate progress. The two bases can be cleared in either
order after the Treasure Hunt.

This is a 2D sequential-battle adaptation of Scarlet/Violet's Star Barrage:
there is no timed auto-battle minigame or special Starmobile battle engine in
this chapter. Existing Pokémon battle mechanics are used instead. Team Star's
remaining three bases and the Clive/Cassiopeia finale remain later chapters.

The Paldea regression validates the map graph, both base gates, retryability,
boss completion, independence from Gym/Titan progress, and save persistence.
