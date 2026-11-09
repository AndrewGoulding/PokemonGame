# Amity Square and Solaceon Ruins

The Platinum importer reads the six accessory pools and daily gift list from
`src/scrcmd_amity_square.c`. The park admits the source species, including the
nine Sinnoh starter stages and the four additional National Dex species. Choose
a party companion at the receptionist. That Pokémon follows even when ordinary
followers are disabled, without rearranging the party. The garden is an authored
2D layout with trees, paths and stone shelters; it is not the native DS matrix.

Talk to the companion, or its central meeting sign, after 200 walking steps.
The next find is selected and saved in advance: 80% accessory, 20% Berry. The
species pools, accessory weights, nine Berry types/weights, and daily gift man's
sixteen options follow Platinum. Accessories share the massage collection and
its nine-per-type cap. Full inventories retain the pending find; cancelling or
reloading cannot duplicate one. The daily man gives five Berries or one accessory.
The source Attract, Secret Power and Spooky Plate pickups are also available.
Moving out of the park ends the current stroll.

All nineteen Solaceon Ruins chambers are connected by their source warp graph.
Chamber geometry is adapted into 2D rooms with clearly marked ladder pads; the
entrance inscription retains the source direction puzzle. The old Ruins map
provides access through its researcher, preserving existing save locations and
the earlier Defog helper. The source Ruin Maniac trainer, bottom-room Mind Plate,
Odd Incense, Nugget and Defog are imported; the two Defog locations share one
reward flag. The final friendship inscription comes from the source text bank.

Encounter levels and rates come from each source chamber's encounter table.
The F/R/I/E/N/D rooms, twenty other letters in dead ends, and punctuation chamber
use `wild_encounters.c`'s actual form groups. Form selection is independent of
encounter slot, as in Platinum. Forms encountered in completed battles are saved
alongside the existing caught-form collection. Twenty-six seen forms open the
Maniac's secret chamber. The short/long/completed tunnel land tables also switch
at the source ten- and twenty-six-form thresholds, including Hippopotas rates.
The Solaceon boy accepts these forms for matching Ball Seals.

Model tests cover reward limits, saved step counters and pending finds, daily
limits, follower selection, every chamber's warp targets, all 28 forms, tunnel
thresholds, unique pickups and save persistence. The native browser test covers
party selection, a stroll with followers disabled, a 200-step find, an actual
F-form Unown encounter, opening the secret chamber and saved research.
