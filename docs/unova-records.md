# Unova Trainer Card and Medal Rally

The five card stars follow `src/ov012/trcard_sys.c:TrainerCard_CountStars`
from pokebw2 commit `588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`: Unova Hall
of Fame, complete non-event National collection, both Entree levels at least
30, Champions Tournament victory (source WBT record 17), and all 41 films
unlocked. Musical props and Subway streaks do not award BW2 card stars.
The card shows each goal and a drawable, clearable signature at the source
192×64 resolution. Bounded stroke coordinates persist in the normal save;
closing the native card or C-Gear saves changes.

All 255 Medal Box entries include source names and descriptions from
`res/medals/medals.json`, `medal_names.txt`, and `title_11.txt`. The catalog
filters earned and trackable challenges. Automatic awards are an offline
adaptation of collecting earned medals from Mr. Medal. Rank upgrades follow
50/100/150/200 medals, with Participation Prize after 201 and category and
all-medal completion awards. These do not manufacture missing challenge wins.

Tracked actions begin after receiving the Medal Box: walking, successful manual
saves (failed saves are rolled back), accepted Center healing, mounting a bike,
completed native battles, including facilities, successful fishing captures, Egg hatches,
completed evolutions, Fly travel, successful shop purchases/spending/Premier
Ball bonuses, Pass Power activation and successful Entree Forest captures.
Automatic checkpoints, cancelling services and replaying records do not count
as manual saves or completed battles. Native action counters cannot be
reconstructed from older saves; existing feature records can be.

Existing saved progress supplies source Unova type collections, regional and
national collections, boxed counts, owned Shinies, Subway attempts and boss
streaks, Institute attempts, twelve PWT tournament wins, Tower/Treehollow areas,
local trades, Musical shows/wins/applause/props, film series and endings,
Funfest starts/clears/scores/all 55 missions, Memory Link conversations, and
monotype/single-member Hall of Fame teams. Hall of Fame type checks follow
the shared engine's current species types; collection type lists follow BW2's
source `type_species.json`. Historical Hall of Fame entries have no Egg flag
and use the saved team as recorded. Unsupported medals explicitly say they
are not tracked; they remain unawarded. In particular, local Funfest starts
never count as 10/30 simultaneous players, and single-player battles do not
count as Link Battles. Field and facility conditions, and those that stay
unawarded, are listed below.

Validation: `tests/unova-records-test.js` covers milestone boundaries, no
zero-threshold collection awards, independent facility records, full Funfest
completion, save persistence, signature bounds and rank/category awards.
`tests/browser/unova-records.js` exercises the native C-Gear, actual pointer
signature drawing, Medal Box filters, save/reload and clearing the signature.


Native battle events now count actual player Splash/Struggle uses, ineffective
moves and super-effective hits. NPC partner moves and recorded playback do not
count, and one battle cannot be applied twice. These follow records 73/74/75/47
in `src/ov167/btl_server_flow.c`; counting facilities follows the source's
`IncRecord` playback guard. Counters are applied before the post-battle save.
The best actual earned EXP in one game day supplies Exp. Millionaire. Earned BP
is cumulative and survives purchases, Big Stadium/Small Court victories count
once per opponent per day, and successful rustling encounters count toward
Superb Locator. All seventeen distinct Type Expert wins supply All Types Champ.
Old saves retain records but cannot reconstruct previously uncounted actions.

`tests/unova-rentals-records-test.js` checks source pool membership and mixed
ordering for every entry size, exclusions and IVs, type-win deduplication,
earned-BP spending, actual engine move events, replay/NPC guards, daily EXP and
sports boundaries and save persistence. The rental browser test enters a Mixed
Rotation tournament through native menus and verifies exact party restoration.

## Field, facility and remaining conditions

These follow `PokemonCenter_CheckMedals` and its special checks in
`src/ov065/scrcmd_pokemon_center.c`, the field scripts' `RecordAdd`/`MedalGive`
commands and `global_10735.s` for Unova's Challenge. Action counters still
begin with the Medal Box; places found are kept from any time, as the source's
event flags are.

- First Step: given with the Medal Box (and recognized for any save that holds it).
- Capturing Spree: best number of catches in one saved game day (records
  0x53/0x54), counted once per completed native battle that ends in a catch.
- Naming Champ: nicknames typed for a newly hatched Pokémon (record 30). Unova
  has no Name Rater and catching offers no naming screen, so hatching is the
  region's naming point.
- Sweet Home: resting with Mom in the Aspertia home (record 72).
- Day-Care Faithful: Pokémon left with the Unova Day-Care lady (record 24).
- Archeology Lover: fossils restored at the Nacrene Museum (record 89).
- Hidden Grotto Adept: all 20 grottoes entered once Bianca has introduced
  them (flags 0xa50–0xa63); a grotto entered before that is not counted.
- Pure Youth: one of N’s released Pokémon in the party, boxes or Day-Care.
- Ruins Raider: reaching the Abyssal Ruins’ deepest floor (4F).
- Bridge Enthusiast: Skyarrow, Tubeline and Marvelous Bridges visited (flags
  0x9bd–0x9bf).
- 20/50/100/1,000 Victories: every Black Tower/White Treehollow trainer, area
  boss and Benga beaten (record 49).
- Undefeated, Pinpoint and Quick Clear: judged when Areas 2–5 (easy) or 6–10
  (hard) are cleared: every floor trainer beaten; no more than three (easy) or
  five (hard) floor-trainer battles; no more than 100 or 1,000 steps since
  entering the area. The adapted floors hold three trainers each, so every
  easy clear (one floor) also meets the easy Pinpoint limit. Runs
  started before this tracking existed are not judged.
- Blockbuster Star: a released film scoring 1,000 or more (record 0x33 keeps
  the best single score; unreleased takes do not count).
- Scored 1,000: a cleared Funfest mission total of 1,000 points, alongside
  the existing 100-point Medal.

Not awarded, because this game has no such feature: Trainer Tips signs and the
Route 2 graffiti (16–18; the imported maps have no Trainer Tips signs),
vending machines (51, 52), Strength boulders on B2W2 maps (58), trash cans
(59), televisions (65), Pokérus (94), the Marine Tube Wailord (97), the
Humilau face board (98), Twist Mountain’s construction-truck quiz (99),
diamond dust (101), Unity Tower for Around Unova (103), Pokémon Mail (166)
and the four seasonal Ferris-wheel trainers with the special riders
(181; the park’s daily Rolan/Colette ride is a different adaptation).
Link- or online-only, with no genuine offline stand-in: wireless passersby
(73–76), Link Battles (109–112; NPC partner and facility battles are not
link battles), trading with the other version (165), Pal Pad Friend Codes
(174–177), Spin Trade (178), Feeling Check (179, 180), Xtransceiver minigames
with another player (195–202), Funfest missions with 10 or 30 players (221,
222) and Game Sync (232). They report no progress rather than a guess.

`tests/unova-records-test.js` covers each new counter, its Medal Box gate, day
rollover, duplicate-battle guard, grotto/bridge/ruins places, N’s Pokémon in
the Day-Care, film release, Funfest score, all six Tower area outcomes and
save/reload. `tests/browser/unova-records-field.js` rests at home through the
native Mom conversation and checks Sweet Home after reload.
