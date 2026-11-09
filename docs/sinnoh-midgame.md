# Sinnoh campaign through Crasher Wake

The Platinum overlay now covers the opening through the Fen Badge. This pass adds
Fantina, Maylene and Crasher Wake as a single progression section, using the
source parties, authored moves, held items and message banks recorded in
`PLATINUM_DATA.source`. The generated dataset contains 818 messages and 181 teams,
including starter-dependent rival and partner variants.

| Section | Playable progression |
|---|---|
| Route 207 / Mt. Coronet | Dawn's Itemfinder gift, Cyrus's first conversation |
| Hearthome | Arrival, two dark symbol-matching rooms, Fantina, Relic Badge and Shadow Claw |
| Route 209 / Solaceon / Routes 210–215 | Barry's starter-dependent battle, route trainers and continuous travel to Veilstone |
| Veilstone | Three punching bags and tyre walls, Maylene, Cobble Badge and Drain Punch |
| Galactic warehouse | Dawn's tag battle to recover her Pokédex, warehouse access and Fly HM |
| Routes 214 / 213 | Route trainers, restored gate and hotel passages, shoreline stairs to Pastoria |
| Pastoria | Barry's next battle, three colored basin switches, Crasher Wake, Fen Badge and Brine |
| Other route content | Imported Route 208 and Route 212 trainers; Route 213 swimmers occupy water and are accessible with Surf |

All rewards and puzzle stages are saved. Losing a battle leaves its progression
stage available for retry. Repeating a completed leader conversation does not
award another badge or TM. Sinnoh's level cap advances to 32 after Fantina, 37
after Maylene and 41 after Wake, independently of other regions' badges.

Veilstone and Pastoria now have functioning Pokémon Centers and Marts, using the
existing service interiors. The new Centers support healing and the existing PC
system. Fly offers a saved list of visited Sinnoh towns while in Sinnoh, plus the
existing other-region map selection. A native Sinnoh Town Map page is still
future work.

## Adaptations

- Exterior geometry comes from the existing Essentials import. Four previously
  nonfunctional gate/hotel buildings now have linked, reciprocal passage rooms.
  The Route 215/Veilstone gate connects both routes, and visible shore stairs
  replace a late-game Rock Climb-only obstacle on the pre-Wake route to Pastoria.
- New Gym rooms are drawn in 2D, not extracted DS models. Hearthome uses saved
  symbol choices, a moving light around the player and wrong-door returns.
  Maylene's bags clear three tyre walls. Pastoria's three basins advance through
  yellow, green and blue switches, opening successive bridges without closing a
  walkway underneath the player. These retain the Gym themes and progression,
  rather than claiming the original 3D layouts or exact puzzle geometry.
- TMs remain reusable and use this project's machine IDs. Imported Wormadam
  parties preserve all three forms as their corresponding battle species.
- This project intentionally removed the VS Seeker in favor of talking to
  defeated Trainers for rematches. Dawn therefore gives the functional
  Itemfinder and explains that system, without awarding an item that save
  migration would delete. Native Pokétch touchscreen apps are not implemented.
- Contests, optional town houses, the Lost Tower/Day-Care story, the post-Wake
  Galactic chase, Psyduck/SecretPotion sequence and later Gyms remain separate
  work. Surf's field permission is granted by the Fen Badge; its Sinnoh HM gift
  still belongs to the later Celestic story.

## Regeneration and checks

```sh
node tools/build-platinum.js /path/to/pret/pokeplatinum
npm test
node tests/browser/sinnoh-midgame.js
node tests/browser/sinnoh-roads.js
```

Browser tests accept `PLAYWRIGHT_PATH` and `CHROMIUM`. They exercise all three new
leader battles, both Barry battles, Dawn's real tag battle, wrong and correct
symbol doors, bag/water changes, healing, the warehouse, all restored passages,
shore stairs and Fly to a saved Sinnoh town. Terrain tests also walk the entire
Hearthome–Veilstone–Pastoria route graph and check saved puzzle stages and retries
for all three starters.
