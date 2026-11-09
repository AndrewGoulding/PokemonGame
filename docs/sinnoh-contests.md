# Sinnoh Super Contests

Hearthome's Super Contest Hall runs Cool, Beauty, Cute, Smart and Tough contests
at Normal, Great, Ultra and Master ranks. Each Pokémon unlocks the next rank by
winning the preceding rank in that category. The practice receptionist offers
individual phases without official rewards. Reception resumes a paused contest;
retiring discards that entry without changing the Pokémon or accessory inventory.

## Imported Platinum content

`tools/lib/platinum-contests.js` reads the reference checkout and exports:

- All 96 opponent records, including names, nicknames, species, moves, conditions,
  rank/category flags, story eligibility and 12 outfit selections. Postgame
  selection requires Champion and National Dex; a special opponent is selected
  from the source special pool when available.
- All 96 source outfit layouts, all 100 accessory names, source accessory sprites,
  and each accessory's ratings under all 12 source themes. Rank-dependent theme
  pools and the 5/10/15/20 accessory limits follow Platinum.
- All 467 Generation IV move entries and all 24 contest effect definitions,
  including appeal and descriptions. Acting implements turn order effects,
  repeat permission, judge bonuses, voltage, voltage protection, next-turn
  doubling, positional bonuses, climax copying and last-place bonuses.
- Source condition/Sheen scoring, primary/secondary scarf multipliers, rank
  thresholds, judge crowding (3/2/1/0), and maximum voltage bonuses (+8 center,
  +5 sides). Phase scores use Platinum's equal weights and integer normalization.
- All 20 first-time accessory prizes, the 18 source backdrop illustrations,
  Floaroma's Berry/accessory exchange recipes, and Pastoria's five scarf rewards
  for a lead Pokémon with the corresponding condition at least 200.

Poffins feed the same `mon.contest` conditions used here and in Hoenn. Accessory
stock comes from the same saved collection as massages, Amity Square and Pal Park.
Wearing accessories borrows them: copies are limited to owned quantities and are
returned automatically. Twenty category/rank ribbons use `superContestRibbons`,
separate from Hoenn ribbons, and count toward the Ribbon Syndicate requirement.

## Play and adaptations

Visual competition gives 60 seconds to dress the entered Pokémon. Pieces can be
dragged, removed, or moved with Shift+arrows after selecting one. Themes affect
ratings; backdrops are decorative. Finish early is available. The stage uses
source accessories/backdrops and the game's existing Pokémon sprite renderer.

Dance is a local keyboard/touch rhythm game: each contestant leads two phrases;
repeat its direction and timing in the second half. Your lead phrases accept
three steps at Normal/Great and four at Ultra/Master. Eight 6.4-second phrases,
rank-dependent timing windows and local opponent accuracy replace the DS timing
and animation engine. Pausing dance restarts that phase; it does not add scores.

Acting allows a move and judge choice in each of four rounds, displays effect
text, order and voltage, and reports appeal/judge awards. NPC decisions use a
local random policy rather than Platinum's bytecode AI. Later-generation moves
use a neutral basic three-heart appeal. A Pokémon with only one move may repeat
it, avoiding an otherwise unusable entry in the expanded species/move system.
The presentation is a 2D menu adaptation, not the DS stage renderer or wireless
contest protocol. Judge positions are fixed locally.

Johanna/Keira's welcome supplies Glitter Powder and the local Contest outfit.
Jubilife's backdrop collector grants one of the 13 source collection backdrops
per game day, replacing the original online dress-up exchange. Pal Park's three
cartridge keepsake backdrops remain available through the existing local gifts.
The theater backdrop is imported for future collection rewards, not silently
unlocked. No Nintendo network connection or trading with another player is implied.

## Save behavior and validation

`flags.sinnoh.contests` stores the entry's Pokémon identity, category/rank/theme,
wardrobe, stage, acting round, scores, voltage, and results records. Stage and
acting-round checkpoints permit reload/resume. Original party, HP, moves, PP,
held item and experience are never replaced. Accepting results awards once and
retains up to 20 dress-up photos. Photo rendering uses the saved placement and
backdrop; it does not depend on still owning those accessories.

Model checks cover source tables/assets, pre/postgame pools, rank gates, wardrobe
quantities, score thresholds/scarves, timing grades, acting, repeat rules, awards,
exchange limits and saved entries. Native browser coverage exercises registration,
dressing, pause/reload/resume, all dance phrases, all acting rounds and results.
