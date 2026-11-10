# Plasma Frigate rooms and engineering

The Frigate now has a native map for each of its 22 source room banks: the
five established story maps plus 17 additional rooms. The new source trainer
records, all remaining Frigate field pickups, Doctor Julius, crew-room bed
and mess-hall dragon research are playable. The field-item importer now covers
253 event banks, with 410 visible and 182 hidden placements (565 unique reward
flags). Its 20 remaining banks are parallel/legacy-world banks.

Black 2 enters the warp deck on B1F and the password/pipe deck on B2F; White 2
reverses that order. The Card holder uses the source Trubbish/Zangoose team in
Black 2 and three Pawniard in White 2, appearing in the appropriate crew room.
Source `global_10885.s` supplies those trainer choices. The five passwords
come from `scrcmd_plasma_frigate_scrcmd_bsubway.txt`, selected by Trainer ID
modulo five as in `src/ov064/scrcmd_plasma_frigate.c`. Native text entry handles
cancellation, incorrect attempts and accent/case normalization.

The warp deck has four enclosed switch chambers, reached through five pairs
of actual native warp pads. Ordinary walking cannot bypass those pads. The
field-item placement and map validation graphs now follow reciprocal warps
within one map, so trainers, pickups and exits remain reachable. Its exact
chamber geometry and pad connections are authored for this game's 2D engine.
The pipe control board uses the source's 16 starting panel states for each
version, the four contiguous groups toggled by switches and saved visible
pipe directions. DS height-based pipe traversal remains part of the geometry
audit; the control board displays and preserves those source states.

Fresh campaign entries require the password and all four warp switches before
Colress, in addition to the existing story barriers. Saves that already began
the previous barrier sequence, beat Colress or reached the Hall of Fame keep
their existing campaign progression. They can still play the engineering
activities; the migration does not award their puzzle clears automatically.
The internal source doorway graph is connected, while outside dock changes
retain the established story route instead of opening every ship phase early.
The full DS conditional actor/ship-phase script VM is not reproduced.

Version-exclusive Magmarizer, Electirizer, Power Band and Power Belt pickups
are filtered in both native NPC visibility and the field journal; common
pickups retain shared flags. See the [source reference item table](https://bulbapedia.bulbagarden.net/wiki/Plasma_Frigate#Items).

After the Hall of Fame, P2 Island has boarding/disembarkation services and
Colress offers the source six-Pokémon team at levels 72–74, including
Rotom-Wash with Hydro Pump. Successful rematches are limited to one per game
day; losses and cancellation allow a retry. His first victory awards one
Master Ball. If its stack is full, the reward waits for another visit without
requiring another battle. Later wins never award another copy. The crew bed
heals on confirmation, and the mess-hall pictures register Reshiram/Zekrom as
seen without awarding catches. The [shared Gen V music import](unova-audio.md) now supplies a labeled BW1
castle-theme substitute for the unavailable BW2-exclusive Frigate recording.

Validation includes `tests/unova-frigate-test.js`, the complete map and field
reachability tests, and the browser scenario `tests/browser/unova-frigate.js`.
The browser enters both White 2 floors, battles for the Card, types both wrong
and correct passwords, toggles pipes, walks every chamber using real pads,
fights Doctor Julius and Colress, sees the dragon pictures, earns the postgame
Master Ball, checks the daily limit, boards at P2 and reloads the save.
