# Unova postgame exploration

The BW2 campaign continues into the southern towns, eastern gateway and northern
caves on authored 2D maps. Source provenance remains the pinned pokebw2 checkout
listed in `data/unova.js`; this is an offline adaptation of its data and events.

Connected areas include Routes 1–3, 8, 14–18, Skyarrow, Marvelous and Tubeline
bridges, Nuvema, Accumula, Striaton, Nacrene, Icirrus, Black City, White Forest,
Pinwheel and Lostlorn forests, Dreamyard, Wellspring Cave, P2 Laboratory, Clay
Tunnel, Twist Mountain, Underground Ruins, Dragonspiral Tower and N’s Castle.
Black City and White Forest are both accessible through the local research gate.
Their challenge facilities are a separate milestone.

Playable quests include N’s level-70 battles and both version dragons, catchable
Kyurem and DNA Splicers, the Regi chambers and party gate, Heatran’s Magma Stone,
Cresselia’s Lunar Wing, the lake guardians, both Dreamyard Eon chases, and Nature
Preserve research with its guaranteed Shiny Haxorus. Defeated static encounters
return after another Hall of Fame entry. N’s dragons and Kyurem are shiny locked.
DNA Splicers preserve the absorbed partner across saves, enforce one active fusion,
and require room to separate. Fused Pokémon cannot be released. Reveal Glass and
the magnetic, moss and ice evolution locations work with the shared party system.

All 20 Hidden Grottos use source version-specific species, level, gender and item
tables. Their Pokémon have Hidden Abilities and cannot be shiny. Contents and IVs
persist through reload; empty grottos have a 5% regrowth check per 256 steps.
Bianca’s first grotto supplies the source male level-20 Skill Link Minccino.
Visible items, hidden items, Bag capacity and retry behavior use native systems.

Other additions include Cheren’s forest escort, source rematch teams for N,
Cynthia, Alder, Hugh and Bianca, Striaton brother tag battles, fossils, Super Rod,
Genesect drive gifts, a separate two-parent Day-Care, and regional/national research.
Research goals exclude source event-only species: 297 regional and 636 national.
Oval and Shiny Charms affect breeding and wild generation through shared systems.
Memory Link choices, the Icirrus quiz and cross-version key access are local
adaptations; they do not connect to DS saves or Nintendo services.

Model tests cover persistence, capacity, retry and cross-region state isolation.
Native browser tests exercise N, dragon captures and a Hidden Grotto capture.
