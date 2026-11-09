# Sinnoh through the Champion

The main story now continues from Crasher Wake through Cynthia. Rebuild with
`node tools/build-platinum.js /path/to/pret/pokeplatinum`. The combined import
contains 1,282 messages and 301 trainer records. Parties retain Platinum's
species, levels, moves and held items, including Cynthia's six Pokémon and
level 62 Garchomp. Source event/script paths remain attached as provenance.

The route through this chapter is:

1. Pursue the Galactic Grunt near Pastoria, get Cynthia's SecretPotion, help
   Route 210's Psyduck, and deliver the Old Charm in Celestic. Defeat Cyrus
   and receive Surf from Cynthia's grandmother.
2. Cross Route 218, battle Barry in Canalave, and ride the Gym's lifts to Byron.
   Meet Rowan at the library. A sailor provides travel to Iron Island, where
   Riley gives Strength. Investigate the drained Lake Valor and Lake Verity.
3. Travel north to Snowpoint, collect Rock Climb on Route 217, push the three
   snowballs across their ice lanes, and defeat Candice. Visit Lake Acuity.
4. Join Looker in Veilstone's warehouse, find the Galactic Key in its basement,
   and navigate HQ's warp floor. Defeat Cyrus and Saturn and release the trio.
5. Climb to Spear Pillar. Fight the grunts, then join Barry against Mars and
   Jupiter. Enter the marked northern portal, push three Strength boulders,
   defeat Cyrus and face level 47 Giratina. Catching or defeating it opens
   the return portal; fleeing or losing permits another attempt.
6. Visit Volkner at Vista Lighthouse, rotate the three Gym gear bridges and
   earn the Beacon Badge. Jasmine gives Waterfall. Travel through Route 223
   and Victory Road, defeat Barry, and register for the League.
7. Defeat Aaron, Bertha, Flint, Lucian and Cynthia in order. Leaving the battle
   wing or losing resets the run. There is no automatic healing between
   Elite Four battles. Cynthia's defeat records a Hall of Fame team, heals
   the party and raises Sinnoh's level cap from 62 to 100.

## Adaptations and limits

These are explicit 2D rooms and story handlers, not a DS map/model or script
interpreter. Lifts, snowball lanes and gear bridges preserve the themes of
Platinum's Gyms with different layouts. Distortion World uses three floating
platform puzzles and the shared Strength engine; it does not reproduce DS
camera changes, gravity or wall walking. Victory Road uses three connected
2D cavern floors with the source trainer parties because the older exterior
project’s cave export marked much of its drawn floor as solid. Acuity’s
climbing face uses the shared Rock Climb field move. Mt. Coronet similarly
uses a junction, northern passage and summit ascent to connect the story; the
summit branch requires the HQ rescue, Strength and Rock Climb. Connecting dialogue is adapted;
imported boss introductions and trainer records come from the reference source.
Barry's Spear Pillar partner party uses two opening Pokémon and his starter,
matching the shared tag engine's three-Pokémon partner limit.

Sinnoh completion uses its own flag and Hall of Fame region. It does not grant
Kanto completion. Saved puzzle states, keys, HM gifts and one-time rewards
survive reloading. The base exterior maps remain Essentials imports; the new
Sunyshore solar bridge and gate connect their existing paths.

This completes the implemented main-story progression, not every Platinum
feature. Optional quests, full NPC scripting, Contests, the Battle Zone and
postgame legendary stories still need dedicated work.

## Validation

`npm test` includes `tests/sinnoh-finale-test.js`: all three starter paths,
progression gates, losses/retries, keys and rewards, tag partner selection,
Giratina outcomes, League order/reset, save reload and regional completion.
`tests/browser/sinnoh-finale.js` exercises native ice and Strength movement,
the Sunyshore gate and the actual Cynthia battle/Hall of Fame screen.
`tests/browser/sinnoh-late-travel.js` checks the mountain stairs, northern
passage, Victory Road exits, League entrance and persisted Hall of Fame.
Browser scripts accept `PLAYWRIGHT_PATH` and `CHROMIUM` environment variables.
