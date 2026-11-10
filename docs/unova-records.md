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
count as Link Battles. Online-only conditions, several field-event counters,
and remaining field/multiplayer conditions remain on the completion checklist.

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
