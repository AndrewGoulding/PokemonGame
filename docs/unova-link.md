# Unova link and online stand-ins

In Black 2 and White 2, 27 Medal Rally medals need another player, a console link or an online server. This game is
single-player, so `game/unova-link.js` gives each one an offline stand-in: a simulated partner takes the other
player's place. A partner is a Trainer named after one of Unova's, with that Trainer's picture, playing Black 2 or
White 2. Everything runs from the C-Gear's **Wireless** panel once you have the Basic Badge, except passersby and
Funfest.

| Medals | Source | Stand-in |
| --- | --- | --- |
| The First Passerby, 30/100 Passersby, Heavy Traffic (73–76) | people passed through the C-Gear, who then visit Join Avenue | each Join Avenue visitor you meet counts once a day (souvenir or shop recommendation) |
| Link Battle Amateur … Born Battle (109–112) | IR, Union Room and Wi-Fi battles | **Link Battle**: Single or Double against a partner's team of Unova Pokémon, as many as your party, at your best Pokémon's level; no Exp., prize money or blackout, and your party's HP, status and PP are restored after. Won or lost both count |
| Opposite Trader (165) | a trade with the other version | **Link Trade**: a partner from the other version offers one of its exclusives (from the encounter tables), at your Pokémon's level |
| First Friend … Global Connection (174–177) | Friend Codes in the Pal Pad (32) | after each activity you may register the partner in the **Pal Pad** (up to 32); later activities can be with a friend from it |
| Spin Trade Whiz (178) | 10 Spin Trades | **Spin Trade**: one of your Eggs for a partner's Egg of a Unova Pokémon's first form |
| Feeling Master, Ace of Hearts (179, 180) | 5 Feeling Checks; a score of 80 | **Feeling Check**: five rounds of four hearts. The partner's mood (fiery, sunny, calm, cool) names their heart three times in four. A match scores 20, a neighbouring heart 10 |
| Minigame Fan … Best Minigamer (195–198); Balloon Rookie … Conqueror (199–202) | Xtransceiver minigames played; points in one game | **Xtransceiver game**: 12 rounds of three balloons worth 10–100; popping the same colour as the last adds 10 for each balloon in the run |
| 10/30 People Funfest (221, 222) | Funfest missions with 10 or 30 players | you and every Pal Pad friend join your missions; clearing one records how many took part |
| Good Night (232) | Game Sync tucking a Pokémon in | **Game Sync**: tuck in a party Pokémon to play in the Pokémon Dream World |

Tests: `tests/unova-link-test.js`, `tests/browser/unova-link.js`.
