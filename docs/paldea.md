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

## Starfall Street: the final three squads and Cassiopeia

Ten new 2D locations bring Paldea to **41 connected maps**. The Navi (Poison),
Ruchbah (Fairy), and Caph (Fighting) squads each receive an approach road,
base, and garage; the Academy gets a courtyard for the Starfall finale.
Explore from Schedar Road toward Tagtree Thicket (Navi), West Province toward
Ruchbah, or East Province toward Caph. The Treasure Hunt unlocks the roads,
while each crew's three staged battles unlock its own garage.

**Atticus, Ortega, and Eri** have save-backed gatekeeper battles, three
base waves, their standard party challenge, and a separate Revavroom
Starmobile adaptation. Defeats are retryable and completed stages stay cleared.
After defeating all five squads, meet **Clive (Director Clavell)** in the
Academy Courtyard, then battle **Penny as Cassiopeia**. These final encounters
are saved individually; repeating them cannot award additional completions.

This concludes the **Starfall Street story adaptation**, not the entire
Paldea campaign. As before, the original timed auto-battle mechanic, exact
Starmobile forms and 3D cinematics have not been ported. Victory Road's
remaining Gyms, the final three Titans, Area Zero and DLC remain unfinished.

The expanded `tests/paldea-test.js` checks all five squads, failed battle
retries, save persistence, gated garages, and the academy finale.

## Main-story finale — all eight Gyms, five Titans, Area Zero

The endgame chapter adds **35 Paldea maps**, bringing the combined Scarlet /
Violet main-story region to **76 connected 2D locations**. The three paths
remain separately tracked through the existing `player.flags.paldea` save.
The game still uses existing Kalos-derived 2D geometry and ordinary battle
mechanics rather than importing Scarlet/Violet's original open-world scenes.

### Victory Road

The final five Gym Leaders now have connected approach roads, towns, Gyms and
Pokémon Centers: **Iono (Levincia, Electric), Larry (Medali, Normal), Ryme
(Montenevera, Ghost), Tulip (Alfornada, Psychic), and Grusha (Glaseado, Ice)**.
Each challenge has two saved preliminary trainers, a Leader team, a single-use
Badge flag and a regional level-cap increase. This 2D version uses linear gates
across those five Gyms. After eight Badges, the Pokémon League opens, with
Elite Four Rika, Poppy, Larry and Hassel, Top Champion Geeta, and a concluding
Champion battle against Nemona. Each success is recorded independently and
losses may be retried without repeating cleared Elite Four members.

### Path of Legends

In addition to Klawf and Bombirdier, meet **Orthworm (Lurking Steel), the
Quaking Earth Titan, and Dondozo / Tatsugiri (False Dragon)**. Each Titan has
an approach map, a retreat destination and a two-stage encounter. Their final
Herba Mystica milestones are saved once, alongside recorded jump, glide and
climb ride upgrades. Ride controls are still unimplemented story milestones.
With all five herbs found, Arven can be challenged at the Academy to complete
Path of Legends and recover Mabosstiff's strength.

### The Way Home / Area Zero

**Area Zero is gated on all three story completions**: the Champion Nemona
battle, all five Herba Mystica and Arven's final battle, and the Team Star
Cassiopeia finale. Speak with the party at the crater gate to choose the
Scarlet or Violet variant. Traverse the upper crater, reactivate two Research
Stations, reach the depths and confront AI Professor Sada or Turo in Zero Lab.
Both variants share the same map. The Quaking Earth Titan and scripted Area Zero
battles follow the selected Scarlet/Violet variant; ordinary random encounters
still use shared encounter tables. The edition is selected when facing Quaking
Earth (or at the crater gate if it has not yet been selected). Defeating the AI Professor records the main-story
completion and removes the regional level cap.

This is a **playable 2D story adaptation**, not a complete recreation of the
Terastal-themed Gym tests, ride mechanics, cooperative Titan cinematics,
Paradox capture cutscenes or full Scarlet/Violet engine. The Teal Mask and
Indigo Disk expansion campaigns are still future work.

Regression: `node tests/paldea-endgame-test.js` is included in `npm test`,
covering map graph, all five Gym wins, Badges and level caps, all Elite Four
battles, Geeta and Nemona, all three new Titans, Arven, Area Zero gates,
research stations, final boss, retries and persistence.

## The Hidden Treasure of Area Zero DLC (2D adaptation)

The Kitakami and Blueberry Academy update adds **22 more connected maps**,
bringing Paldea to **98 total areas**. The school trip begins at Naranja/Uva
Academy after finishing The Way Home. Kitakami includes a bus arrival,
Mossui Town, a Community Center, Apple Hills, Loyalty Plaza, Oni Mountain,
Crystal Pool and Dreaded Den. Carmine, Kieran, the Festival of Masks, the
Loyal Three, and a **catchable Ogerpon** form the Teal Mask storyline. A lost
battle or an uncaught Ogerpon can be retried without losing completed steps.

After capturing Ogerpon, Blueberry Academy opens from the Academy travel
connection. The Terarium includes Savanna, Coastal, Canyon and Polar biomes,
with four Blueberry League Elite Four challenges (**Crispin, Lacey, Amarys and
Drayton**). These use the shared engine's native **double-battle** format.
Win all four to challenge Champion Kieran in the League Club arena; thereafter,
return to Area Zero's Zero Lab to reach the Underdepths and catch **Terapagos**.
Catching it records completion of The Indigo Disk and both DLC adventures.

After The Indigo Disk, a Mochi Mayhem epilogue is available in Mossui Town,
featuring an optional capture of **Pecharunt**. All catches use the real
wild-battle/capture system, rather than granting Pokémon without a battle.
Kitakami and the Terarium each have a healing/respawn point, alongside Mossui / Terarium Town Map Fly spots.

This is a **playable 2D interpretation** using existing maps, battle assets,
encounters and save infrastructure, not a verbatim import of Scarlet/Violet
DLC maps, scripted cinematics, Blueberry point mechanics or original trials.
Ogerpon's masks and Terapagos's special battle phases are not yet represented
in their full original-game forms. The DLC save flags reside in
`player.flags.paldea`; both adventures are resumable.

Regression: `node tests/paldea-dlc-test.js` is included in `npm test`.

## Visual polish pass — original 2D Paldea environments

`ui/paldea-art.js` draws **original, deterministic pixel tile scenery**
over the still-navigable 2D layouts; it does not change their collision,
warps, NPC positions or wild encounter tables. The overworld renderer caches
one generated canvas per location. Kitakami's village, apple orchards,
mountains and festival areas now have distinct palette and landmark motifs.
Blueberry Academy's Savanna, Coastal, Canyon and Polar biomes have individual
visual treatments, while Area Zero and the Terapagos chamber use glowing
crystal-like pixel motifs. The styling also covers mainland Paldea so it no
longer looks identical to its borrowed Kalos map images.

The Kitakami festival now includes a repeatable mask identification choice. Each Blueberry Elite Four member also has a short, saved, interactive trial before their battle; incorrect answers can be retried, and winning a trial means it does not have to be repeated after a battle loss. These are lightweight text-choice adaptations, not replacements for the original DLC minigames.

The BB League now uses different **existing battle backdrops** for Crispin,
Lacey, Amarys, Drayton and Kieran. Ogerpon, Terapagos and Pecharunt show their
existing Pokémon sprite portraits before their catchable encounters, and
those battles use terrain-appropriate backgrounds. These are adaptations
using existing assets, not ported 3D models, canonical DLC tilesets, original
character sprites or new soundtracks.

`tests/paldea-dlc-test.js` verifies distinct biome classes, cached drawing,
region isolation, legendary portraits and battle background selection.

## Paldea cast sprite and landmark upgrade

The overworld now supports **21 original, simplified nine-frame character sprite
sheets** for the major Paldea and DLC cast, including Nemona, Arven, Penny,
Clavell, five newly introduced Gym Leaders, five Team Star bosses, Carmine,
Kieran, Briar and the Blueberry Elite Four. These are hand-authored,
color-coded 32×32 pixel-styled SVG sheets, with standing down/up/side and
walking down/up/side poses, in `assets/world/sprites/paldea/`. They are **not
ripped or exact reconstructions** of official Scarlet/Violet character art.

The `data/paldea-character-looks.js` mapping replaces generic NPC sprites
for the named scenes without moving any NPC, changing its dialogue, or
altering story gates. The overworld sprite renderer uses the SVG extension
only for sprites prefixed `paldea/`, leaving all legacy PNGs untouched.

Original pixel scenery also now includes **specific landmarks** on solid tiles
(e.g., the Academy façade, Mossui lantern, Festival of Masks sign, Terarium
dome, and Terapagos chamber crystal) in addition to regional biome palettes.
Landmarks preserve collision and are drawn beneath NPCs. The DLC regression
checks named cast assets, the nine-frame format, and landmark coverage.

## Original navigable towns, interiors, and refined character sheets

Paldea's geometry is no longer exclusively copied from Kalos. The
`game/paldea-layouts.js` module now constructs **original navigable 2D
ground plans** for selected mainland towns, Kitakami sites, Blueberry spaces,
Gyms, the Academy and other important interiors. It distinguishes avenues,
plazas, garden blocks, counters, halls, labs, garages, arenas and dedicated
rooms. The plans are deterministic and preserve all reciprocal warps, NPC
coordinates, healing spots, Fly landings and older save points. The remainder
of the region still uses 2D map templates until future work replaces it.

`ui/paldea-art.js` renders corresponding paving, accent floors, room
furniture, stadium motifs and location landmarks over those custom collision
grids. The visual art and walkable geometry now agree for the selected spaces.
This is an original top-down interpretation, **not** a recreation of the
original Scarlet/Violet open-world layouts, assets or exact building plans.

The **21 custom character sheets** have also been corrected and refined:
actual hexadecimal paint colors, distinct hairstyle silhouettes, coat and
scarf accents, and character-specific accessories. The sheets remain
lightweight 9-frame SVG pixel artwork, not official character sprite rips.

Regression tests `tests/paldea-layouts-test.js` and
`tests/paldea-dlc-test.js` check town/interior connectivity, preserved
anchors, non-Paldea isolation, matching renderer metadata and valid sprite
sheet paints.

## Chromium exploration and navigation QA

`tests/browser/paldea-exploration.js` boots an actual browser from a Paldea
save, walks through selected towns and interiors using keyboard controls,
checks rendered pixels and different scenery, validates real 9-frame SVG image
loads, interacts with the Kitakami Community Center NPC through the game's
normal dialogue system, and records screenshots. GitHub Actions installs
Chromium/Playwright and runs this browser test after the complete `npm test`
suite. Screenshot artifacts are uploaded from
`tests/browser/out/paldea/` (retained for seven days).

A separate movement pass corrected **invisible elevation differences** on
Paldea's newly drawn 2D floorplans. The former Kalos map heights could block
a route even when both the visual map and collision grid showed a clear floor.
Custom town and interior layouts now have normalized flat elevation; the
`tests/paldea-layouts-test.js` regression performs actual `World.step`
traversal checks, not just collision flood-fills, and verifies NPC approaches,
Fly/respawn positions and door access without altering the other regions.

The automated Chromium checks are still a representative exploration sample,
not full human QA or a claim that all 98 maps have been visually inspected.
