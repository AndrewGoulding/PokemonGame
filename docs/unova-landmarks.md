# Unova landmarks counted by the Medal Rally

`tools/lib/unova-landmarks.js` places the outdoor source objects the Medal Rally counts, projected from their source
grid onto the authored maps the same way as the houses (`docs/unova-houses.md`). Like the source's event flags,
what you find is kept from any time; the medals follow once the Medal Box is held.

| Medal | Source | Here |
| --- | --- | --- |
| Signboard Starter / Savvy (16, 17) | 18 Trainer Tips flags 0xa64–0xa75, `PokemonCenter_CheckTrainerTipsSigns` | 19 signs with their source text on Nimbasa, Opelucid, Pinwheel Forest and Routes 1–9, 12–14 and 19 (both Route 4 maps share flag 0xa6b) |
| Graffiti Gazer (18) | `route_2` Script_3: read the sign facing down | the Route 2 sign shows its graffiti line when read from its north side |
| Hustle Muscle (58) | `PokemonCenter_CheckStrengthRocks`, 20 moved rocks | 34 of the source's 40 `OBJ_CODE_MODEL_BIGROCK2` boulders in 14 mapped caves (Victory Road 12 and 14 and White Treehollow 4 are not mapped); each boulder counts once when first pushed |
| Wailord Watcher (97) | `marine_tube` Script_1 gives it from 15:00 to 16:59 | entering the Marine Tube in those hours |
| Face Board Memorial (98) | `humilau_city` Script_10, after the Hall of Fame flag 0x960, once a day | the face board in Humilau after the League, with the photographer's four source lines |
| Heavy Machinery Pro (99) | `twist_mountain_5` Script_3 | the Pro in Twist Mountain asks one TruQ question a day (answers 1, 2, 3, 4, 2 by position); a wrong answer waits until tomorrow; five right gives the medal |
| Diamond Dust (101) | `Field_CheckGiveDiamondDustMedal`; the calendar gives Icirrus diamond dust only on 31 December | entering Icirrus City on the game calendar's last day (day 30 of month 12: Unova's months here have 30 days) |
| Ferris Wheel Fan (181) | `global_10510`: the four `sSeasonTrainers` for your sex, plus flags 0x171–0x175 that no script sets | after the League, the Ferris wheel offers the season's rider (Persephone, June, Trisha, December for boys; Dirk, Augustin, Andy, January for girls); battle and ride with all four seasons' riders. The five unset flags are left out |

Landmarks avoid the outer map rows and any tile the player couldn't stand on to read them. Boulders go only where they
leave every warp reachable and can be pushed two ways.

Tests: `tests/unova-landmarks-test.js`, `tests/browser/unova-landmarks.js`.
