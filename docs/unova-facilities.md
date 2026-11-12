# Unova battle facilities

Black Tower and White Treehollow are playable offline 2D challenges. Each has ten
areas with the source floor counts `1,1,1,1,1,2,3,2,3,4`: 19 floors per facility.
The authored floors contain three trainer searches, a Gate Trainer, an area boss,
a nurse and a retirement attendant. Source random DS room generation is adapted
to these walkable layouts; it is not emulated.

Opponents use pokebw2’s `black_tower` sets and trainer pools, filtered by the source
rank and version table in `src/ov127/infinity_dungeon_rooms.c`. Level ranges rise
from 47–50 to 74–77. Each trainer brings two Pokémon, with source moves, natures,
held items and EV flags, and source zero IVs. Seeded rosters, Gate Trainer identity,
defeated trainers and the once-per-area nurse persist in the save. Gate and area
progression cannot be bypassed through the floor exits. Items and field moves are
restricted during the run; loss restores the party and returns to reception.

Area 10 ends with Benga’s source level-80 team: Latios/Garchomp/Volcarona in Black
Tower, Latias/Dragonite/Volcarona in White Treehollow. Clearing each facility unlocks
its separate level-1 Shiny Gible or Dratini gift at Alder’s home. A full party does
not consume the reward. Both facilities are accessible through the research gate.

The generator imports all six source facility set catalogs and their usable
trainer pools. The completion checklist tracks the remaining formats.

## Subway, PWT and Institute

Gear Station offers seven-battle Singles and Doubles lines with separate saved
streaks, the normal 21-win bosses and Super 49-win bosses. A normal line’s 21-win
record unlocks its corresponding Super line. The source boss sets are assigned to
Ingo’s singles and Emmet’s doubles roles; generic opponent scheduling is adapted.
The last facility battle can be replayed locally from the Subway desk.

PWT’s additional stage attendant offers Driftveil, five regional Leaders, World
Leaders, Champions, Type Expert, Rental/Rental Master and Mix/Mix Master. These
run three level-50 Singles or Doubles battles with source trainer metadata, sets,
portraits, IVs and special ace sets. World Leaders requires a win in each regional
Leaders tournament, Champions requires ten World Leaders wins, and the Master
rental/mix formats require three wins in their basic format. Rental teams come
from the source rental catalog; Mix exchanges affect only temporary Pokémon.
The original level-25 story tournament retains its original progression.

The Institute offers five-battle Singles and Doubles trials using the source
Subway catalog, with local scoring based on wins and turns. Trial scoring, generic
opponent scheduling and facility BP awards are offline adaptations. Facility BP stays separate from other
regions, and the exchange has all 60 source BP items/TMs and source prices. TM
numbers are translated to the shared engine’s machines by move, so, for example,
the source Ally Switch offer teaches Ally Switch rather than a later TM51 move.

Entry rules reject Eggs, restricted legendary/event species, later species/forms,
duplicate species and duplicate held items. Native party selection chooses three
for Singles or four for Doubles. Temporary level-50 copies battle without Bag
items, gimmicks, experience or cash prizes. The original party, including its HP,
PP, held items, experience, and special fields, is restored after win, loss or
cancellation. Loading an interrupted challenge restores it and ends that Subway
streak. Native browser tests exercise entry, consecutive matches, restoration and
saved records.

Triple/Rotation battles, full multi-partner facility ladders and the original DS
Institute scoring remain outside these formats; download opponents are below.
The existing source partner tag event is still playable separately.

## Multi Trains

The basic and Super Multi Lines are seven-match native tag battles. Enter two
Pokémon and choose Rosa or Nate with a balanced, offense or defense pool. The
six source pools are the imported Subway catalog's trainer records 300–305;
the visible partner portraits/names use the chosen protagonist. A compatible
pair is drawn after entry, excluding your selected species and held items.
The partner controls their own moves and replacements using the shared engine's
AI. Each opponent is a separate trainer with two Pokémon and their own bench.
Basic battle 21 pairs Ingo's Galvantula/Durant with Emmet's Garbodor/Klinklang;
Super battle 49 pairs Eelektross/Archeops with Excadrill/Haxorus. These use the
source sets, including the basic bosses' shared Occa Berries across trainers.
Ordinary generated pairs avoid duplicate species/items across the pair.

The source `src/ov033/bsubway_trainers.c` now drives Singles, Doubles and Multi
streak-dependent trainer ranges and IV bands: normal first-six ranges
0–49/30–69/50–109 and final-car ranges 50–69/70–89; Super first-six ranges
110–159/140–179/160–199/180–219, final-car ranges
160–179/180–199/200–219/220–239, then 200–299. This prevents protagonist
partner pools from appearing as ordinary Super opponents. Boss records retain
their source teams. Partner choices and trainer draw RNG are local adaptations;
the DS partner-selection UI and wireless pairing are not emulated.

Multi and Super Multi retain separate saved streaks/bests/attempts. A basic
21-win record opens only Super Multi. The Multi Boss medal reads that record;
no Link Battle medal is awarded for playing with a local NPC. Rentals, level-50
copies, moves/PP, held items, HP and the exact original party continue through
the existing restoration and interrupted-save recovery. The last match remains
available for recorded playback. Triple/Rotation and the offline download
facilities are described below.

`tests/unova-multi-test.js` runs 21 native model tag battles and checks all six
source partner pools, entry compatibility, exact boss teams, saved streaks,
unlocks and medals. `tests/browser/unova-multi.js` plays seven matches through
the native entry/battle UI with an AI partner and verifies saved records and
byte-for-byte restoration of the original party.

## Triple Battles

PWT tournaments now offer Singles, Doubles and Triples. Triple entry requires
six Pokémon and uses three active positions per side, with three decisions per
turn, ordinary bench replacements and the existing exact-party restoration.
All thirteen local tournament categories have playable six-member brackets.
Source rosters with fewer than six usable sets are excluded from Triple draws;
no invented Pokémon are appended to those undersized tables. Unrestricted
Driftveil/Mix rosters may repeat a species using distinct source sets, following
`WbtPartyFilter_Create`'s `allowSameSpecies` rule. Held items remain distinct.

Wing Pokémon reach the opposing center and nearby wing, plus their own center.
The center reaches every opponent and both allies. The source move `distance`
flag allows distant targets (Flying attacks and pulse moves, for example).
Spread attacks affect only adjacent Pokémon and retain native spread damage.
Redirection and Intimidate respect range; ally hooks and shared abilities can
see both neighbors of a center Pokémon. Two adjacent Friend Guards stack their
0.75× protection. The ordinary doubles/horde formats
retain their existing behavior.

SHIFT replaces the unusable RUN command on a Trainer battle's wing menu. It
uses that Pokémon's action to swap with the center, preserves PP, boosts,
Substitute and other state, and does not trigger entry hazards or switch-in
abilities. The last Pokémon of each side automatically moves to the center.
Ally Switch exchanges the two wings and fails from the center. The six sprites,
six readable healthboxes, target cursor and move previews use the same 2D style
as existing battles. The shared GBA animation player maps the participants of
an effect into its four animation slots and echoes additional spread targets;
it does not emulate the DS battle renderer.

The rental catalog now retains source file order. Normal rentals use files
1–132 and Master rentals use 209–558, matching the first source rental group.
Player rental IVs are 20 as in `WbtParty_CreateInitialParty`; opponents use their
trainer IVs, draw from the corresponding rental pool and exclude the player's
selected species. This corrects drawing rental teams from the trainer's
ordinary pool. The second and mixed source pools are described below.

`tests/triples-test.js` verifies range/long-range/spread targeting, two adjacent
allies, invalid-target rejection, Shift state and action cost, final centering,
Ally support and Intimidate, exact seeded replay, 45 randomized/AI battles,
source rental pools/IVs/exclusions and six-member entry for every PWT category.
The browser test enters six Pokémon, renders all six, performs Shift, plays a
three-match bracket and checks recorded format and original-party/save recovery.


## Rotation Battles

All thirteen PWT categories also offer four-member Rotation entry. Three Pokémon
are visible on each side, with one front Pokémon attacking and receiving attacks.
ROTATE selects either reserve and then opens that Pokémon’s move menu. The change
commits only with the attack and resolves before move priority. Rotating costs
no attack, preserves boosts, Substitute, status, PP and held items, and triggers
neither entry hazards nor entry abilities. Reserve status and volatile counters
pause while they are away from the front. The fourth Pokémon uses ordinary
switching. A reserve can move forward after the front faints without resetting
its state. Recorded playback retains the rotation choice and format.

Charles now uses his source Triple team in Black 2 and Rotation team in White 2,
with a short control lesson and a three-healthy-Pokémon requirement. Existing
Charles victory flags still open the drawbridge. Imported field trainer records
retain source Triple/Rotation formats rather than silently becoming Singles.

The engine tests cover planned rotations, pure move previews, invalid choices,
PP and state preservation, paused reserve poison, faint promotion, reserve move
reordering and 35 randomized/AI battles. The browser test exercises four-member
entry, six displayed roster members, ROTATE and move selection, a three-match
bracket, recorded format and original-party/save restoration.


## Remaining rental pools and tournament records

Rental and Rental Master reception now offers First pool, Second pool and Mixed
pools for Singles, Doubles, Triples and Rotation. The second pool uses source
files 133–208 (normal) or 559–908 (Master). Mixed rentals draw the first three
from the second pool and any remaining members from the first, as
`WbtParty_MakeParty` does. Species and held items remain unique across both
parts. Opponents use the same mode, retain source trainer IVs and exclude the
player’s selected species. All original party and interrupted-save protections
continue to apply. Type Expert records retain each of the seventeen completed
types independently; repeated wins of one type cannot earn All Types Champ.


## Offline download facilities

The DS distributed PWT tournaments, Wi-Fi Train rooms and special Battle Tests over
Nintendo Wi-Fi Connection or wireless delivery. That content is not in the ROM or the
decomp, so these facilities ship bundled offline "downloads" that follow the source
structure and rules. `tools/build-unova-downloads.js` (`npm run build:unova-downloads`)
writes `data/unova-downloads.js` from pokebw2; it does not touch `data/unova.js`.

**PWT Download Tournaments.** A Tournament Download System attendant stands beside
the PWT stage reception. As in `t_download.c`, it lists received tournaments, shows
each one's rules and bans, saves up to three tournaments (`WBT_SLOT_COUNT`), refuses
duplicates ("already been saved") and a fourth slot ("slots are full"), deletes with
the source double confirmation, and shows each slot's win count. The reception's
tournament list gains Download, which opens after a Driftveil win (or the story
tournament) as `WbtTournament_IsOpen` requires. Choosing a saved slot plays an
eight-Trainer bracket built as `WbtMakeMatch_PickDownloaded`/`PlaceEntrants`/
`WbtSystem_PlayFirstRounds` do: the player, up to four cast Trainers and the table's
dedicated download Trainers (0x44-0x57); the three highest ranks are seated in the
first round, semifinal and final; other matches are decided by rank, then the source
type chart (70%) or a coin flip. The regulation is enforced at entry and in battle:
count, level mode (cap/all/raise/maximum/minimum), banned species and items, duplicate
species/items, a required type and a banned move. Both sides take the regulation's
level. Wins give the source Download BP (2/2/3/3 by style) and count per slot.

The six bundled packs are authored stand-ins. Their names, descriptions, cast choices,
slot ranks, extra item bans and lines are not source data; their rules are source
regulations (24, 16, 26, 32, 33) and their teams come from the source PWT catalogs:

| Pack | Style | Regulation | Cast |
| --- | --- | --- | --- |
| Unova Leaders Cup | Singles, 3 | 24 (Lv. 50 cap, legend bans) | Cheren, Elesa, Drayden, Marlon |
| Dragon Type Cup | Singles, 3 | 24 + Dragon type, no Sky Drop | Drayden, Clair, Lance |
| Champions Doubles Invitational | Doubles, 4 | 16 (WCS-style, Chatot/Soul Dew) | Blue, Steven, Cynthia, Alder |
| Kanto Classic Triples | Triples, 6 | 26 | Brock, Misty, Erika, Giovanni (+ Striaton trio) |
| Sinnoh Rotation Free-for-All | Rotation, 4 | 32 (duplicates allowed, all Lv. 50) | Volkner, Byron, Candice, Fantina |
| Hoenn Item Clause Cup | Singles, 3 | 33 + Focus Sash/Choice item bans | Norman, Winona, Juan, Wallace |

Downloaded Trainers use the cast's source set pool (drawn like a table Trainer) rather
than a fixed six-Pokémon download record, and their source IVs. The regulation's time
limit, the World Championships battle background and source trainer-class message sets
are not reproduced.

**Wi-Fi Train.** A Wi-Fi Train attendant stands on the Gear Station platform (Bolt
Badge required). Board downloads your rank's numbered train; as in `wifi_bsubway.c`, a
train taken today cannot be taken again until the next game day ("until the next
update"). Earlier train replays the last downloaded train without changing rank.
Successive records lists your best score and clears per rank and train. Trains use the
source sizes (ranks 1–10, seven Trainers, three level-50 Pokémon, Subway entry rules)
and dialogue. Rank rules follow `BsubwayScr_UpdateStageRank`: a ranked seven-win clear
promotes (to rank 10) and clears the loss count; ranked losses in a row demote at the
source limits 5/4/4/3/3/2/2/1/1 for ranks 2–10; rank 1 never drops. Quitting a ranked
train by reloading counts as a loss, as the source's unsaved-quit check does. BP is the
source Wi-Fi row (10 for a ranked clear) and 5 for an earlier train. The score uses
`BSubwayScoreData_CalcWifiScore` without its fainted-Pokémon and damage terms.

Offline, each rank has 20 trains (the server decided the count, up to 200). A train's
seven Trainers and their Pokémon are generated deterministically from its rank and
number using the source Subway catalog; rank N draws from the source
`bsubway_trainers.c` ranges in rising order (0–49 at rank 1 up to 220–299 at rank 10)
with the source IV bands. Real players, their messages and the 30 room leaders are not
available; successive records show only your own results.

**Special Battle Tests.** The Battle Institute menu gains Special. As in the Trial
House delivery flow, it downloads the next bundled test (Single, then Double), allows
one try (a reload mid-test spends it), runs five battles even after a loss, and ranks
the result with the source thresholds (1000–6000) and Beginner–Master dialogue. The two
tests' examiners are authored picks from the source Subway catalog, ending with the
Subway Bosses. Points weigh wins at 1000 as `TrialHouseCalcPointScore` does; its other
statistics are not tracked, so a turn bonus stands in for them. Tests give no BP.

Original parties are restored after every challenge through the shared facility runner.

Skipped as live online or not a facility: Random/Rating/Wi-Fi Club/Union Room battles
and Wi-Fi Competitions (live opponents), Comm Multi trains (wireless partner), Global
Link/Dream World, the Wonder Launcher, Mystery Gift and Musical prop distributions
(not battle facilities), and Entralink/Funfest online missions (covered offline
elsewhere).

`tests/unova-downloads-test.js` checks the source tables, every pack's rules and
brackets across seeds, slots, BP and records, Wi-Fi ranks/day locks/demotion/recovery
and Battle Test one-try scoring. `tests/browser/unova-downloads.js` saves a tournament
at the PC, plays it through native entry and battles, boards a Wi-Fi Train and checks
saved progress and exact party restoration.
