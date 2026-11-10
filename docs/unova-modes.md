# Easy and Challenge modes

The Aspertia researcher and the C-Gear's Difficulty panel select Normal, Easy or
Challenge for future Unova Trainer battles. Normal is the default. Existing Gym,
quest, caught-Pokémon and party progress is retained when switching.

## Source data and behavior

Reference: `fuddlesworth/pokebw2` at
`588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`.
`tools/lib/unova-modes.js` imports the 18 alternate Challenge records for all eight
Gym Leaders, the first League and League rematches. Source party members, IV
difficulty, held items and moves come from the actual alternate trainer records.
The source's normal trainer IDs remain the progression/defeat flags.

The source `easy_level` of each `res/field/zones/*.json` drives the signed level
change, following `adjustPkmLvForChallengeKeys` in `src/system/btl_setup.c`.
Easy subtracts it; Challenge adds it. Authored extra rooms inherit a source zone
through their nearest connected imported room. Ordinary field/story opponents
and both enemy teams in tag battles are copied and adjusted; the player's party
and NPC partner keep their own levels. Wild encounters and fixed rental/facility
battles retain their existing levels. Recorded battles keep the resulting teams.

For example, Challenge Cheren has Patrat/Pidove/Lillipup at 12/12/14 with the
source higher IVs. First-Challenge Shauntal has five Pokémon at 60–62, and
Challenge Iris's rematch reaches 83. Easy Cheren keeps the ordinary two-member
team at 10/12. Normal behavior remains unchanged.

This project recalculates stats at the adjusted level using its shared battle
engine. It does not reproduce the DS difficulty-level stat recalculation bug.
The project's regional level caps are also an adaptation: Challenge raises the
cap by the next Gym/League's source offset, while Easy retains the normal cap.
A completed Unova League still unlocks level 100. Other regions keep their caps.
The AI remains the project's shared opponent AI, rather than a DS AI interpreter.

## Keys and offline sharing

Iris awards the version's source key: Challenge for Black 2, Easy for White 2.
Existing Champion saves migrate that key. The researcher also offers explicitly
local key sharing, supplying both keys without another console. This authored
replacement makes difficulty modes playable during a first local campaign,
including the first Gym; it does not emulate the original infrared Key System.
The selected mode and collected keys persist in the save.

## Validation

`tests/unova-modes-test.js` checks all alternate records and zone assignments,
keys, normal/easy/challenge teams, exact Cheren/League levels and IVs, caps,
bounds, opponent-only copies, preservation of other regions and save reload.
`tests/browser/unova-modes.js` receives keys, chooses Challenge, beats the actual
three-member Cheren team, verifies Badge/cap progression, switches to Easy from
the native C-Gear and wins a reduced-level Virbank worker battle before reloading.
The complete regression suite checks the shared cap and battle-entry integration.
