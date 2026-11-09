# Sinnoh source coverage and final audit

The final pass imports all **158 encounter banks** in the Platinum checkout,
including room and water-level variants. Separate interiors now cover Café
Cabin, Oreburgh Gate B1F, Oreburgh Mine’s upper floor, Iron Island’s right
basement/exit chamber, Galactic HQ 3F, Mt. Coronet’s tunnel/snowfields and the
two eastern Victory Road chambers, Trainer School and Twinleaf home. Existing campaign and escort paths remain
available. Entrances are visible, reciprocal and protected by the appropriate
Rock Smash, Galactic campaign or Champion/National Dex access checks.
Turnback Cave selects its source encounters from pillar progress; Maniac
Tunnel keeps its existing research-dependent tables. Unused/alternate source
variants remain in the generated data. Existing 2D geometry is retained or
adapted; these are not DS matrix/map-model reproductions.

There are **533 imported trainer records**. This pass adds the remaining 29
Platinum field trainers; the two unused Diamond/Pearl Gym trainers are
excluded. School battles, Celestic’s grunt and both stronger Barry teams are included; Rowan’s lab lets the custom protagonist choose Lucas or Dawn as the research partner; their source teams and back artwork are used. Trainers without explicit moves now use the source species’ last
four distinct level-up moves instead of the shared engine’s later-generation
learnsets. Battle calculations continue to use the project’s shared engine.

The field-item pass covers **553 visible/hidden pickups**, including **249
hidden items**, in addition to the dungeon items and scripted rewards imported
earlier. Source TM/HM numbers are resolved by their actual moves into this
game’s reusable machine catalog. Matching legacy pickups keep their original
collection flags. Existing extra legacy rewards remain available. Scripted
Galactic keys, Lunar Wing and Suite Key retain their story implementations.
Item balls, hidden pickups and the Itemfinder now retain full-Bag rewards for
a later attempt. New placements reserve doors, their approach tiles and other
hidden-item positions.

Town additions include the parcel/Town Map quest, School reward, 27 source gifts, the three timed Celestic glasses,
Café Cabin’s Milk shop, the Effort Ribbon, three daily Berry givers and the
Sprayduck. Route 208 sells the four source mulches for ₽200. Sinnoh Berry
patches use all 64 source growth records: moisture drain, watering, yield
ratings, ripe windows, regrowth limits and withering. Growth/Damp/Stable/Gooey
Mulch retain their respective source effects. Time advances through this
game’s saved walking clock; farming XP remains available. Existing growing
patches migrate without losing their Berry, growth stage or ripe yield, with
a fresh current-stage timer. Other regions retain their existing farms.

Mt. Coronet now supports Magneton and Nosepass’s location evolutions. Eevee
can evolve by level-up in Eterna Forest or on Route 217. These location
methods take priority over friendship evolutions; the modern stone methods
remain available. White/Black Flutes modify local encounters until leaving
the map. The local slot-machine challenge awards Explosion after ten paying
rounds: an explicit offline adaptation using this project’s existing slot
game, rather than Platinum’s DS bonus-round presentation.

Validation includes source coverage, item identity/flags, all added room
entrances and exits, source moves, reward capacity and daily retries, Berry
arithmetic/regrowth/migration, location evolution priorities, cross-region
farming and stone behavior, and saved records. Browser tests cover native
shops/gifts, source TM and hidden pickups, full-Bag retries, all thirteen room
entrances/returns, planting/mulch/watering and save reload. The full suite also
checks Kanto, Johto, Hoenn, Orre and the earlier Sinnoh campaign and features.

Sinnoh’s offline feature checklist is complete after these checks. Network
trading, multiplayer minigames, device cartridges and event distribution use
the local substitutes documented in each feature’s notes. This is feature
completion for this game’s 2D adaptation, not a claim that every DS object,
line of dialogue, visual effect or networking protocol has been reproduced.

Barry’s weekend rematch uses the Survival Area teams, rising to his source
level-85 starter after twenty Hall of Fame entries. The original Fight Area
rematch NPC remains as a compatible alternative, sharing the daily battle flag.
