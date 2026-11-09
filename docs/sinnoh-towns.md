# Sinnoh town services and expeditions

`tools/build-platinum.js /path/to/pret/pokeplatinum` now imports all four
`res/npc_trades` records, Bebe's Eevee (20), Veilstone's Porygon (25),
Platinum's shard tutor prices and all 493 species' level/tutor learnsets.
Town interiors and cave layouts are authored 2D adaptations with visible
entrances; field models and trainer parties use the source assets/data.

Trades retain source nicknames, OT, ID, IVs, personality, held item, language
and contest conditions. Levels match the offered Pokémon. Mindy's Haunter
keeps its Everstone and does not evolve. Meister's German Magikarp enables
the Masuda Method: this game's Gen 6 breeding uses six shiny rolls for parents
of different languages, plus two with a Shiny Charm. Legacy records default
to English. Refused/cancelled trades leave the party and completion flag alone.

Solaceon uses the shared two-parent Day-Care UI, growth, breeding and hatching,
with independent `sinnohDayCare` and `sinnohDayCareEggs` records. Deposits,
withdrawal fees, full-party Egg retries and compatibility behave like the
existing Day-Cares. Other regions retain their own records.

The three shard tutors use Platinum compatibility and prices. Pastoria's
reminder offers source level-up moves through the Pokémon's current level.
Cancelled teaching costs nothing. Fan Club Poffin Case, Solaceon Seal Case,
Shell Bell and Eterna's Recycle TM are one-time regional gifts. Machine items
are resolved by move because this project's TM numbers differ from Platinum.

Mira's Wayward Cave and Marley's postgame Victory Road branch use source
partners, trainers and wild slots, shared double battles and post-battle
healing. Escort completion saves and unlocks their Battleground eligibility.
Marley requires the Champion and regional research certification. The cave
geometry is a connected 2D adaptation, not a DS matrix recreation. Wayward's
hidden basement has source Gible encounters; its final Earthquake reward
requires riding the Bicycle, a simplified jump-course check.

Lost Tower has five connected floors and source wild/trainer encounters.
Floors 3–5 have fog. Defog is available through the native party menu with the
Relic Badge and clears each floor independently. The top-floor women give
Platinum's Spell Tag and Cleanse Tag only after its fog clears (not the older
Diamond/Pearl Strength reward). Cleared fog persists as a local adaptation.
A researcher in Solaceon Ruins supplies the project's Defog HM; its exact
pickup placement is adapted. Wayward uses native Flash/darkness.

Validation: source/runtime tests cover retries, cancellations, payment,
foreign breeding rolls, save reload, partner battles, gates, rewards and
reachable cave actors/exits. Browser scripts exercise native gifts, trades,
Day-Care, partner battle and Defog UI. See the completion checklist for
remaining Sinnoh systems; this milestone does not claim the region complete.

The same import includes 80 additional source trainer parties across Route
210 north, Route 211, Routes 219–221 and 224–230, Fuego Ironworks, Maniac
Tunnel and optional Iron Island rooms. Land, Surf and all three rod tables
come from their source encounter JSON. Extra geometry pieces share encounter
tables without duplicating trainers. Route 211 retains separate east/west
land tables; placements and their midpoint boundary are adapted to this
project's map. Swimmers are placed on connected water terrain. Sinnoh's
morning/day/night slots now follow the walking clock; other regions retain
their previous encounter selection. Escort battles generate their second
wild opponent from the local table instead of the player's level.

This raises the imported roster to **464 trainer records**. The route list is
saved in `PLATINUM_DATA.routes.coverage`. It is not a claim that every old
Essentials cave branch or field item has been audited; those remain on the
completion checklist.
