# Unova encounters, services and optional exploration

The import uses the pinned pokebw2 checkout’s `enc_pokeset.c`, shard-tutor tables,
31 trade records, item-collector price lists and authored 2D optional areas.

Memory Link at the Driftveil shelter or N’s Castle enables the 14 source released
Pokémon. Their maps, levels, natures, gender and ability slots come from the source
table. They have N’s OT/ID 2, all-30 IVs, maximum friendship and shiny locks.
Encounter chance falls from 40% to 20%, 10% and 5% as more are recovered; Repel
checks their own levels. Captures persist, including PC delivery. The existing
level-25 Zorua gift remains separate. Natural encounters identify N’s Pokémon and
preserve their fixed nature rather than applying Synchronize.

Postgame swarms use the 19-entry table for each version, source levels 40–55 and
the source 41% encounter check. A saved daily selection survives reload and changes
with the selected version. Gear Station’s attendant reports the current location.

Driftveil, Lentimas, Humilau and Nacrene tutors offer all 60 source shard moves,
source prices and source species compatibility. Payment occurs after successful
learning, so cancellation does not spend shards. PWT also has a native reminder
and deleter. Separate tutors handle pledges, starter ultimate moves, Draco Meteor,
Meloetta’s Relic Song and Keldeo’s Secret Sword. The BW2 Pledge Grove tutor requires only Keldeo; the three other swordsmen
do not need to be in the party. Keldeo’s form follows whether it knows the move.
The reminder and level/evolution flows use the shared battle engine.

Seven ordinary trade offers are available across Route 4, Route 7, Humilau,
Route 15 and Accumula, including the version-specific Route 4 pair. The two
Accumula trades progress in order. Source nicknames, OT IDs, IVs, natures, genders,
levels, abilities and held items are retained. East Sea Shellos has imported front,
back, shiny and icon art, and its form carries into breeding and evolution.

The dropped Xtransceiver in Nimbasa opens an offline Curtis/Yancy contact through
the Dropped Item and C-Gear. Ten local conversations lead to returning the device,
30 unlock daily trades, and 50 reveal the owner’s stage identity. Conversations
are limited to ten per saved day; these replace the original location-based calls.
Each owner cycles through the source twelve Hidden Ability trade offers. Trades
accept a non-Egg party Pokémon, reject fused Kyurem and preserve daily progress.

Hugh’s postgame Undella rematch awards Dive. Four visibly dark patches extend the
existing Undella Bay map and use the native Dive/surface controls. Four authored
Abyssal Ruins floors provide a 190-step first-pillar route, Flash and Strength
barriers, a 500-step current, persistent treasure pickups, plates and Relic Crown.
These layouts and English riddle hints adapt the source’s larger maze. The visit’s
clock and opened gates save; leaving the ruins starts a fresh visit.

Five collector desks use the complete source gourmet, rare-bone, mulch, treasure
and mineral price lists. Ordinary Bag space, funds, one-time trade flags and item
retries are preserved. For example, the Undella collector pays ₽300,000 for the
Relic Crown. Newly needed collectible items use source graphics and palettes.

Model tests cover rates, source data, capture persistence, tutor payment, trades,
phone limits, forms, ruin gates/timers and collectors. Native browser tests cover
Dive, all three pillars, Crown collection, expulsion, selling, the C-Gear phone,
and a natural N encounter/capture with its fixed properties and saved reload.

The [source treasure import](unova-ruins.md) now supplies all 45 repeated placements on the first three Abyssal floors, with saved legacy rewards migrated and the fourth-floor Crown retained.
