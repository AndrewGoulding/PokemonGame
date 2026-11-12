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
