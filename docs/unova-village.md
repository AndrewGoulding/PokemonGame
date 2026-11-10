# Village Bridge houses and quests

All eight Village Bridge house banks are connected to authored riverbank
neighborhoods around the existing bridge. Source actors and their dialogue
populate the stonecutter, restaurant, fishing club, training, former performer,
rest and practice houses. The empty eighth source bank remains empty.

Baker Chris uses his source Heatmor at level 42. After winning and entering the Hall of Fame, showing a
non-Egg party Pokémon with Honey Gather earns three Lum Berries once.
Speaking to the girl practicing strange sounds reveals the town's secret;
the curious resident then awards five Sitrus Berries once. The rest-house
attendant heals the party. Tubeline Bridge's Soundproof request retains its
source dialogue without adding an invented prize.

The Hip Waders club selects a daily species from the unique regular and
rippling fishing species in Village Bridge, Routes 1/3/13/17 and Wellspring
Cave, for the current season and version. This is the pool used by
`src/ov036/scrcmd_encount.c`. Show a matching party Pokémon caught that game
day to receive five Dive Balls, once per day. The fish stays in your party.
The target is saved, including across reloads, and resets on the next game day.

Successful ordinary captures now record `met.caughtDay`. Gifts, trades and old
records do not receive a fabricated catch date. As elsewhere in this game's
calendar adaptation, the challenge uses game days instead of the DS calendar.
All three quest rewards leave their flags unclaimed when the Bag lacks room.

Source references: `res/field/events/village_bridge*.json`,
`res/field/scripts/village_bridge*.s`, corresponding text banks, and the pinned
pokebw2 checkout's trainer and encounter tables. These are native 2D adaptations,
not original DS map geometry or the Black/White restaurant waiter minigame.

The importer reads both berry IDs and quantities from the original scripts.
Earlier builds awarded Persim/Lum in place of Lum/Sitrus. Existing quest flags
and inventories are preserved; returning to each completed quest delivers the
correct source berries once, with full-Bag retry. Fresh claims store reward
revision 2 and never receive that legacy correction.
