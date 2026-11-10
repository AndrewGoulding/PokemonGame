# Eastern Unova and the League

The Black 2 / White 2 campaign continues from Skyla’s flight to Lentimas
through Reversal Mountain, Undella, Lacunosa, Village Bridge, Opelucid,
Humilau, the Plasma Frigate, Giant Chasm, Victory Road and Champion Iris.
This chapter adds 52 authored tile maps, source field teams/encounters and
character art, with additional cave terrain, dragon platforms, lily-pad
platforms, Marine Tube scenery and themed League rooms.

## Main route

Fly from Mistralton after earning the Jet Badge. Bianca can accompany the
Reversal Mountain exploration with her source Musharna/Stoutland/Mienfoo
team; the native double-battle adapter supplies wild pairs and post-battle
healing. Meet Hugh in Undella, then join his starter-dependent source team
against Zinzolin and a grunt in Lacunosa. Routes 12/11 and Village Bridge
lead west to Drayden.

Drayden’s five Veterans guard three adapted dragon-platform controls. His
Normal Mode team is Druddigon 46, Flygon 46 and Haxorus 48. The Legend Badge,
Dragon Tail and regional cap 51 follow. Repel three Opelucid grunts and
Zinzolin, then confront the Shadow Triad that steals the DNA Splicers.
Marine Tube then opens the route to Humilau. Marlon’s six Ace Trainers guard
three lily-pad crossings. His Carracosta 49, Wailord 49 and Jellicent 51 award
the Wave Badge, Scald and pre-Champion cap 59.

Colress’s device on Route 22 awakens Seaside Cave’s Crustle. Route 21 has a
real Surf crossing; teach the shared Surf machine to a compatible Pokémon.
The Frigate chapter combines the later visits into five connected ship rooms:
Hugh tag encounters, both late Zinzolin teams, four guarded barrier switches,
Colress’s five-Pokémon team and all three Shadow Triad teams. The encounter
teams and starter variants come from the source, while travel, barrier layout
and event sequencing are adapted for this tile engine.

In Giant Chasm, Ghetsis fuses Kyurem with N’s dragon: Black Kyurem in Black 2,
White Kyurem in White 2. Both forms now have source stats, abilities, Gen 5
moves, front/back/shiny sprites and party icons. The level-55 climax battle
prohibits capture. N restores the party before Ghetsis’s six-Pokémon battle.
Saved progress permits retrying Ghetsis without repeating an already-cleared
Kyurem battle. Hugh’s final source team guards the Victory Road summit.

Register at the League, defeat its four members in any order, then challenge
Iris. Her Normal Mode team is Hydreigon, Druddigon, Archeops, Aggron and Lapras
at 57, with Haxorus at 59. A defeat, leaving the League or entering its Center
ends that run. Victories, including partially completed runs, save correctly.
The Hall of Fame records the team and clears the regional cap to 100. New
runs use the source Normal Mode rematch teams, including Iris’s level-78
Haxorus. This does not imply Easy/Challenge Mode or original BW1 story coverage.

## Optional exploration and integration

The three swordsmen appear at their source routes and levels, with postgame
retries after defeat. Strange House’s adapted book/attic sequence gives the
Lunar Wing. Route 13’s treasure hunter uses the saved daily clock; Shopping
Mall Nine uses the shared mart. Reversal Mountain’s deeper chamber reserves
Heatran’s postgame encounter for the Magma Stone quest.

The source supplies cries for the later-generation Pokémon used by this
import, including the fused Kyurem forms. A regional cry registry extends the
existing audio fallback without changing the original FireRed cries. Shared
battle AI, mechanics, item prices, music tracks and general progression
systems remain in use; this is an offline 2D adaptation rather than a DS VM.

The exact source revision and event/text/encounter paths remain recorded in
`UNOVA_DATA.source`. Rebuild with `node tools/build-unova.js /path/to/pokebw2`.
Model checks are in `tests/unova-east-test.js`; native browser checks cover
both final Gyms, invasion, ship events, the fused Kyurem battle, Ghetsis,
League rooms, Iris and saved reload in `tests/browser/unova-east.js`.
