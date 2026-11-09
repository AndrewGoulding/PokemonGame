# Sinnoh optional quests and the Stark Mountain postgame

This pass adds four saved quest chains. It builds on the campaign through
Cynthia; it does not implement all of Platinum's optional or postgame content.
The current combined import has 1,359 messages and 331 trainer records.

## Iron Island and Riley

Sail from Canalave to Iron Island using the existing sailor. Enter the cave at
(26, 6) and speak to Riley near the entrance. The Mine Badge is required.
Riley joins battles with Platinum's level 41 Lucario. Ordinary wild encounters
become doubles, his party is controlled by the shared partner battle system,
and surviving battles heal your party. His support applies inside this quest's
cavern and ends after defeating the Galactic Grunts together.

The eight optional trainers, two Galactic Grunts and wild land slots come from
Platinum's Iron Island B2F left room. The room itself is an adapted 2D cavern.
After the Grunts flee, Riley offers a Riolu Egg. Refusing or having six Pokémon
leaves the reward available; talk to Riley again after making room. Receiving
an Egg does not register Riolu as caught. Hatching uses the shared Egg system.

## Old Chateau and Rotom

A marked stone doorway in Eterna Forest's interior clearing (62, 30) leads to
an adapted Old Chateau television room. An old woman nearby gives a hint.
Interact with the television at (12, 6) at night to encounter level 20 Rotom.
This uses the game's saved walking clock, not the device's real-world time.
A failed, escaped or defeated encounter can be retried on a later night.
Catching Rotom permanently completes the encounter.

The Secret Key, appliance room and Rotom form-changing quest are still future
work. This addition provides the haunted television encounter.

## The lake trio

After freeing the lake Pokémon and resolving Giratina's encounter, return to
the caverns at Lake Valor, Lake Acuity and Lake Verity. The normal lake entrances
lead into new 2D chambers; the drained Lake Valor story cavern and Saturn battle
remain in place during the main campaign.

Azelf and Uxie battle at level 50. Mesprit instead leaves its cavern and starts
roaming: eligible grass and water encounters on Sinnoh routes have a 1/16 chance
to become Mesprit. Its level, identity, moves, remaining PP, HP and status survive
running away, blacking out, travelling and saving/reloading. Catching it ends
its roaming state. Roaming does not affect other regions or incidental Mesprit
encounters elsewhere.

The roaming encounter uses the shared wild battle engine. It does not reproduce
Platinum's moving route marker or automatic first-turn fleeing. Roaming Mesprit
is encountered alone, rather than being replaced by this project's random
horde/double encounter roll. Defeated lake legendaries return after another
Sinnoh League victory; caught ones remain completed.

## Battle Zone, Buck and Heatran

After becoming Sinnoh Champion, the sailor in southern Snowpoint offers the
Battle Zone ferry. At Fight Area, Buck offers to guide you to Survival Area.
Talk to him there to begin the Stark Mountain expedition. These guided trips
provide access while the older Battle Zone exterior maps remain explorable.
Visited Battle Zone towns join the saved Sinnoh Fly destinations.

1. Defeat Platinum's postgame Mars and Jupiter teams in the entrance cavern.
2. Join Buck in the next room. He battles with his imported Claydol party and
   heals your party after surviving battles, using the same partner mechanics.
   Sixteen source trainers and the room's wild encounter slots are imported.
3. Use Strength to push both boulders north onto the marked hollows. The goal
   positions and completion survive saving; unsolved boulders reset on reentry.
4. Enter the inner chamber. Looker and Croagunk foil Charon's theft and arrest
   him. This is an adapted dialogue scene; Charon does not have an invented
   boss battle. Return to Survival Area and speak to Buck to restore the stone.
5. Return to the chamber to encounter level 50 Heatran. Losses or escapes allow
   another attempt. Defeating it allows a return after another Sinnoh League
   victory; catching it permanently completes its encounter.

The cavern geometry, two Strength goals and guided travel are adaptations.
There is no DS script-bytecode, camera or follower interpreter. Battle Tower /
Frontier expansion, Battleground rematches, the remaining legendary stories,
Contests, Day-Care and other town quests still need separate work.

## Importing and validation

```sh
node tools/build-platinum.js /path/to/pret/pokeplatinum
npm test
node tests/browser/sinnoh-sidequests.js
node tests/browser/sinnoh-roamer.js
```

The builder records source event/script paths and imports authored trainer
parties, encounter levels, level-up moves, wild slots, companion portraits and
selected dialogue. It reads the reference checkout without modifying it.
Browser tests accept `PLAYWRIGHT_PATH` and `CHROMIUM`.

The headless suite exercises prerequisites, wins/losses, Egg refusal and full
party retries, daily Rotom timing, legendary outcomes and League respawns,
Mesprit's saved battle state, regional isolation, postgame travel and continuous
map/actor access. The browser suite exercises the actual Riley tag battle,
Riolu reward, television battle, Mesprit release, native Strength boulders,
Charon's arrest, Buck's stone restoration, Heatran and persisted quest progress. A separate browser check verifies an
actual Mesprit battle updates the roaming state through the game wrapper.
