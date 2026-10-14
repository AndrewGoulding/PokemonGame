# Pokémon Game

A browser Pokémon game built on a Gen 6 singles battle engine. Plain JavaScript,
no build step and no dependencies.

## Running it

Open `index.html` in a browser. FireRed's opening plays (the copyright screen,
Game Freak's shooting star, then Gengar and Nidorino's fight; Enter, Z or a tap
skips it) and leads to the title screen: Charizard, rising flames and PRESS
START. Left alone for 45 seconds the title goes back to the opening. Start a
**New game** and you get FireRed's new-game intro: the controls guide, the
Pikachu pages, then Prof. Oak, who shows you a Nidoran♀ and has you name
yourself before you shrink away into Pallet Town, just outside Red's house. Try
to leave town through the tall grass to the north and Prof. Oak stops you and
walks you to his lab, where Leaf is waiting; pick Bulbasaur, Squirtle or Charmander from the
Poké Balls on his table (each one shows you its Pokémon before you decide).
Leaf walks over and takes the one that's weak against yours; on your way out she walks up
to you for a practice battle, then heads off. Then Route 1's tall grass, north of town, has FireRed's wild
Pokémon. Gary's older sister Daisy, at her table next door, introduces
herself and gives you a Town Map the first time you talk to her. Red's Mom heals your party, and the PC upstairs stores items (there's a
Potion in it to start).

North of Route 1 is **Viridian City**. The Poké Mart clerk hands you Oak's
Parcel; take it back to Prof. Oak for your first five Poké Balls (new games
start without any), and after that the Mart
sells to you and the old man lying across the road north gets up and shows you
how to catch Pokémon. The Pokémon Center's nurse heals your party (and is where
you return if you black out), and its PC holds both Pokémon and items. There's
also a move tutor who teaches Dream Eater once, a school and the Nickname house.
Route 2, Route 22 and the Gym aren't built yet; walking into the Gym's door
tells you it's locked (it opens at seven badges in FireRed).

**Controls**: arrow keys or WASD to walk, press Shift (or X / B, or the Run button) to start running and again to stop (from the start, indoors too, with FireRed's running animation), Z / Space /
Enter to talk or read signs (or click / tap a person, sign or PC: you walk over
and talk), Esc or M for the menu. In menus, the arrow keys
move between choices, Z (A) picks one and X / Esc (B) goes back. On a phone, use the D-pad
and A / Run / Menu buttons under the text box.

The **menu** has your Pokémon (tap one for its summary: stats, IVs, EVs, nature,
moves; make it lead; use, give or take items; drag one card onto another to swap
them, or press and hold first on a phone), the Bag (medicine, evolution
stones, Rare Candy, vitamins, PP Ups, mints, TMs/HMs, held items, and Key Items:
the Exp. Share, Oak's Parcel and the Town Map), the Pokédex (a red Poké Ball
marks species you've caught, a gray one those you've only seen; wild Pokémon
show the same mark in battle),
your trainer card (save, download or load a save file), and **Debug** (for
testing; it asks for a password the first time each session): add any Pokémon at any level (type its name, e.g. `charizard` or
`rotom-wash`; a full party sends it to the PC), infinite Rare Candies, every TM
and HM, 99 Max Repels, 99 Master Balls, or a wild battle at your level.
Healing, shopping and the PC are in the towns: each Poké Mart sells exactly
what it does in FireRed (Viridian: Poké Balls, Potions, Antidotes and
Paralyze Heals), at Gen 6 prices.

Battles open as in FireRed: from the map the screen flashes white twice and
slices away; the wild Pokémon slides in (in shadow) as your trainer does from
the other side, it lights up and appears, and your trainer throws your first
Pokémon's Ball. Repels (from the bag) keep wild Pokémon below your lead's level
away for 100, 200 or 250 steps. In battle you can fight, use items from the Bag, switch, and in wild battles
throw balls or run. Pokémon gain experience and EVs, level up mid-battle, learn
moves and evolve afterwards. Click the text box (or press Space) to skip ahead.

**Saving**: the game saves automatically to this browser (including where you
are on the map) after every battle, story event and menu change, and
**Continue** picks up where you left off. Saves from before the overworld put
you outside your house in Pallet Town. Browser storage can be wiped (private windows, clearing site data), so
download a save file from the trainer card as a backup, or to move a game to
another browser.

To run the tests (needs Node.js):

```sh
npm test
```

## Overworld maps

The maps are FireRed's, converted from the [pret/pokefirered](https://github.com/pret/pokefirered)
decompilation: Pallet Town, Red's house (both floors), the rival's house,
PROF. OAK's lab, Route 1, Viridian City with its Pokémon Center (both
floors), Poké Mart, school and Nickname house, Route 2 with its trade house
and gate, Viridian Forest with both of its gates, Route 22 and its League
gate, and Pewter City with its Gym, Museum (both floors), Poké Mart,
Pokémon Center and houses, Route 3 with its eight trainers, Route 4 with
its Pokémon Center, and Mt. Moon (1F, B1F, B2F). Tiles, palettes and metatiles come from
`assets/tilesets/`; layouts, doors, signs, people, their text and wild Pokémon
come from a pokefirered checkout, and so do trainers (`src/data/trainers.h`,
`trainer_parties.h`, class names, front pictures). `tools/build-maps.js` turns them into
`data/world-maps.js` and the images in `assets/world/`:

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/pret/pokefirered
cd pokefirered && git sparse-checkout set --no-cone data/layouts/ data/maps/ data/text/ data/scripts/ \
  data/event_scripts.s src/data/object_events/ src/data/wild_encounters.json graphics/object_events/pics/ \
  src/data/trainers.h src/data/trainer_parties.h src/data/text/trainer_class_names.h graphics/trainers/ && cd ..
node tools/build-maps.js pokefirered     # or: POKEFIRERED=pokefirered npm run build:maps
```

### Intro

The opening movie, title screen and Prof. Oak's speech use FireRed's own
graphics and text, converted by `tools/build-intro.js` into `assets/intro/` and
`data/intro-text.js` (it needs `graphics/intro/`, `graphics/title_screen/`,
`graphics/oak_speech/` and `data/text/new_game_intro.inc` in the checkout):

```sh
cd pokefirered && git sparse-checkout add graphics/intro/ graphics/title_screen/ graphics/oak_speech/ && cd ..
node tools/build-intro.js pokefirered     # or: POKEFIRERED=pokefirered npm run build:intro
```

`ui/intro.js` plays them on a 240x160 canvas, following the timing in pret's
`src/intro.c`, `src/title_screen.c` and `src/oak_speech.c` (frame counts at 60
a second). There's no music or cries.

### Battle backgrounds

Battles use FireRed's battle terrains (`graphics/battle_terrain/`), drawn by
`tools/build-battle-bgs.js` into `assets/battle/<terrain>.png`: grass, long
grass, sand, water, pond, underwater, mountain, cave, building, plain, and the
Link, Gym, Leader, indoor, Elite Four and Champion palettes, as in pret's
`src/battle_bg.c`:

```sh
cd pokefirered && git sparse-checkout add graphics/battle_terrain/ && cd ..
node tools/build-battle-bgs.js pokefirered     # or: POKEFIRERED=pokefirered npm run build:battle-bgs
```

Each image is the 240x112 scene above the text box, platforms included, plus
the same ground without platforms; the battle screen slides the foe's half in
from the left and yours from the right, as FireRed does. Your trainer then
throws a Poké Ball (the one your Pokémon was caught in), which arcs over,
pops open, and your Pokémon grows out of it; a trainer's Pokémon are thrown
in from the right, and Pokémon switched in later from the side. A Pokémon
switched out goes back first: its ball appears, it turns red and shrinks
into it, with FireRed's words for how much of the foe's HP went while it was
out ("that's enough!", "come back!", "OK!", "good!"), or "withdrew" for a
trainer's. Every
Pokémon stands on its platform: `tools/build-sprite-metrics.js` measures the
empty rows under each sprite into `data/sprite-metrics.js`, along with
FireRed's `gEnemyMonElevation` for foes that float or fly (later Pokémon
with Levitate float 8 pixels). `ui/game.js` picks
the terrain like FireRed: tall grass for grass encounters, the building scene
indoors, a cave underground, and the plain scene elsewhere.

To add maps, list them in `MAPS` at the top of `tools/build-maps.js` and rerun
it; doors and map edges connect themselves when both sides are built.
Walking off an edge toward a map that isn't built yet says so.

Rules follow Gen 3: collision and elevation per block, solid doors you walk
into, door mats you walk out through, stairs, ledges you can jump down,
connected maps you walk straight into, and tall grass encounters at the map's
rate (Random() % 2880 < rate × 16) using the 20/20/10/10/10/10/5/5/4/4/1/1
encounter slots. Wild Pokémon come from both versions: where LeafGreen's table
has a different Pokémon in a slot (Sandshrew for FireRed's Ekans on Route 4),
either is as likely. FireRed's TMs found in item balls become this game's
machine for the same move (TM09 Bullet Seed is TM100 here). An Escape Rope works
where FireRed allows it (caves, Viridian Forest) and takes you back to where
you last went from outdoors through a door or cave entrance. Trainers work as in FireRed: one you haven't beaten sees you
straight ahead within their sight range (nothing in between), shows "!",
walks up and battles with their FireRed party (fixed IVs, set moves where
FireRed sets them); beaten, they say their after-battle line. Those that turn
(`face_down_and_up`, `look_around`) can spot you as they turn. Hidden items
are found by pressing A facing their tile. Battles use the map's own FireRed
battle scene where it has one (the Gym), and Gym Leaders the Leader one. Signs and people say their FireRed text (with names in normal
case: "Viridian City", not "VIRIDIAN CITY"), and item balls give their item.
Scripted events (Red's Mom healing, the PCs, the starter Poké Balls, Oak walking you
to his lab, the rival battle, the Route 1 Potion, Oak's Parcel and the
Pokédex scene (your rival comes back, Oak fetches the two Pokédexes from the
desk at the back; until then there's no Pokédex in the menu), the
Viridian old man, the nurse, the move tutor, the Route 2 trade of Abra for
Mr. Mime "Mimien", Prof. Oak's Aide giving HM05 Flash for ten kinds
caught, your rival Gary on Route 22 (Pidgey and Eevee, as in Yellow), Red
catching up with you at the north end of Viridian Forest (with the starter
that beats yours and Pikachu), the League gate guard, Pewter's Gym guide
and Museum guide walking you over, the Museum's ₽50 ticket, the Old Amber,
the Seismic Toss tutor, Brock (Zubat, Geodude, Vulpix and Onix) with the Boulder Badge and TM39, Leaf waiting outside the Gym
afterwards for a battle (her starter and a Jigglypuff), the Mega Punch and Mega Kick tutors (who teach
again and again, for ₽1,000 each time), the
Magikarp salesman, Super Nerd Miguel and the Mt. Moon fossils, and Jessie & James
at the end of Mt. Moon as in Yellow) are in `ui/game.js`; their FireRed
lines come from `window.WORLD_TEXT`, and cutscenes play FireRed's movement scripts
(`walk_up`, `walk_in_place_faster_down`, `emote_exclamation_mark`, ...) from
`window.WORLD_MOVEMENTS`; the converter writes both alongside the maps. Running
uses the frames from `assets/sprites/overworld/player_character_surf_run.png`.
You play as a custom character (Red and Leaf aren't playable: they're rivals
in this game), and your rival is always Gary. Oak's speech asks only your
name, and doesn't introduce your rival. At the start, Leaf is in Oak's lab
instead of Gary: she takes the starter that beats yours and battles you on
the way out, with Gary's FireRed lines in her name ("Prof. Oak" for his
"Gramps"). Gary turns up later, from the Pokédex scene on. The character's pictures: `assets/sprites/trainers/back/player_character.png`,
`assets/sprites/overworld/player_character_<normal|bike|fish|item|surf|surf_run|vs_seeker_bike>.png`
(recoloured from Red's by `tools/recolor-player-overworld.py`: black cap,
silver hair, red shirt, black backpack), and its trainer-card picture
(`assets/sprites/trainers/front/player_character.png`) and Oak's-speech portrait
(`assets/intro/oak-speech-player-character.png`), by `tools/recolor-player-fronts.py`.
`Player.LOOKS` in `game/player.js` lists them.

## Progression rules (Gen 6)

- **Experience**: the six growth curves, and base exp × level / 7 split between
  the Pokémon that battled, ×1.5 from trainers and with a Lucky Egg. Catching a
  Pokémon also gives experience. EVs come from the defeated species' yield.
  With the **Exp. Share** on (a key item you start with; use it from the bag to
  switch it off and on), each Pokémon that battled gets the full amount
  instead of a split, and the rest of the party (not fainted) gets half, plus
  EVs, as in X and Y.
- **Explorer Kit** (a key item you start with): use it from the bag in a cave
  (Mt. Moon) to dig in the wall, as in Diamond and Pearl's Underground. Hit
  tiles with the Pickaxe (1 energy) or the wider Hammer (2 energy) to clear
  the rock (1-6 layers; grey bedrock can't be dug) and uncover 2-4 buried
  treasures. The dig ends when every treasure is out (they go in your bag) or
  your energy runs out (40 at mining level 1, rising to 100 at level 100).
  Every hit earns 1 mining XP and every treasure 10 more; the top of the
  screen shows your mining level, a bar to the next one, and your energy.
  Levels take 20 XP each up to level 20, then 40, 60, 80 and 100 (5,980 XP in
  all for level 100). Only common treasures (Heart Scales and shards) turn up
  at first; rarer ones unlock along the way: Hard Stones and Everstones at 5,
  Revives, Star Pieces and Oval Stones at 10, the evolution stones at 20,
  every fossil at 30, some held items at 38 and 51, Max Revives and Rare Bones
  at 63 and the plates at 100. Each fossil is only found in its own caves:
  Kanto's (Helix, Dome, Old Amber) in Mt. Moon; later regions' fossils will
  get caves of their own. The rules are in `game/mining.js`, the screen in `ui/mining.js`.
- **Catching**: the Gen 6 formula (HP, catch rate, ball and status bonuses,
  four shake checks). Poké, Great, Ultra, Master, Net, Nest, Repeat, Timer,
  Quick and Dusk Balls have their bonuses. No critical captures yet.
- **Running**: always escapes if faster; otherwise speed × 128 / foe speed +
  30 per attempt, out of 256.
- **Evolution**: `data/evolutions.js`, generated from Pokémon Showdown's Gen 6
  data by `npm run build:evolutions` (needs `npm install` first). Level,
  friendship (220+), time of day, held item, known move, gender, party and
  stat conditions all work. Stone and trade evolutions are in the data but
  need the bag and trading, which come later. A few conditions this game can't
  model yet (Moss Rock, magnetic fields, rain, an upside-down console) are
  swapped for the nearest playable rule; each has a `note` explaining it.

- **Items**: Gen 6 effects for potions and drinks, status cures, Revives, PP
  restores, vitamins (10 EVs each, up to 100) and Rare Candy. In battle, using
  an item takes your turn and happens before moves.
- **HMs**: one set for every region: HM01 Cut, HM02 Fly, HM03 Surf, HM04
  Strength, HM05 Flash, HM06 Whirlpool, HM07 Waterfall, HM08 Rock Smash,
  HM09 Dive, HM10 Defog, HM11 Rock Climb.
- **TMs**: X and Y's TM01–TM100 in order, minus Flash and Rock Smash (HMs
  here), then Secret Power from Omega Ruby and Alpha Sapphire (TM99) and
  Bullet Seed (TM100, FireRed's TM09). Compatibility comes from the Gen 6
  learnsets; for HMs and for machines Gen 6 never had (Bullet Seed), also from
  any generation that taught the move by machine (`data/machine-learners.js`,
  built by `npm run build:machine-learners` from @pkmn/dex), which covers
  Bullet Seed, Whirlpool, Defog and Rock Climb. The same file has
  `TUTOR_LEARNERS`: who FireRed's move tutors can teach (Gen 6 had no tutor
  for Mega Punch, Mega Kick, Seismic Toss or Dream Eater), from any
  generation's tutors. TMs are reusable (as in Gen 5+), can't be held, tossed or
  sold, and HM moves can be forgotten like any other (there are no field moves
  yet). Prices: HMs ₽3,000; TMs ₽10,000 / ₽20,000 / ₽30,000 by the move's
  power. Saves from before this numbering are converted on load, so each
  machine keeps its move.
- **PP Up / PP Max**: +20% of a move's base PP per PP Up, three at most (PP
  Max goes straight to three). Tracked per move; a forgotten move loses them.
- **Mints** (from Sword and Shield): all 21. A mint changes the Pokémon's
  nature to the mint's, replacing the old one (unlike Sword and Shield, where
  only the stats change). ₽20,000 each from level 30.
- **Money**: trainers pay their class's base payout × their last Pokémon's
  level. Blacking out costs your highest level × 8 (more with badges). Buying
  10+ Poké Balls at once gets a free Premier Ball.

## Layout

| Path | Contents |
|---|---|
| `data/` | Pokédex, moves, abilities, items, item sprite paths, learnsets, evolutions, overworld maps, natures, type chart, plus the battle hooks for conditions and moves |
| `engine/` | Stat, damage, experience, catch and item formulas, and the battle engine |
| `game/` | Game logic around the engine: party records, the player and their save (`player.js`, `save.js`), bag and Poké Mart (`bag.js`), overworld rules (`world.js`), evolution, encounters, random teams and the opponent AI |
| `ui/` | Text box and menus (`screen.js`), the battle screen, the overworld (`overworld.js`), FireRed's intro (`intro.js`), and the game flow, story events and menus (`game.js`) |
| `tools/` | Data generators (`npm run build:evolutions`, `npm run build:item-sprites`, `npm run build:maps`, `npm run build:intro`, `npm run build:battle-bgs`, `npm run build:machine-learners`, `npm run build:sprite-metrics`) and their shared PNG/GBA/text helpers (`tools/lib/`) |
| `assets/sprites/` | Pokémon sprites (front, back, shiny), item icons, trainer and overworld sprites |
| `assets/tilesets/` | FireRed's tilesets (tiles, palettes, metatiles), the source for the maps |
| `assets/world/` | Generated map images and transparent overworld sprites |
| `assets/intro/` | Generated opening movie, title screen and Oak's speech graphics |
| `assets/battle/` | Generated battle backgrounds (FireRed's battle terrains) |
| `tests/` | Loads every non-UI script and checks formulas, engine regressions, progression rules and AI choices, plus 200 random battles |

## Script load order

Every file sets a global on `window` (for example `window.DEX` or `window.Battle`),
and later files read those globals, so scripts must load in this order:

1. `data/type-chart.js` → `TYPE_CHART`
2. `data/natures.js` → `NATURES`
3. `data/dex.js` → `DEX`
4. `data/moves.js` → `MOVES`
5. `data/abilities.js` → `ABILITIES`
6. `data/items.js` → `ITEMS`
7. `data/learnsets.js` → `LEARNSETS_GEN6`
8. `data/machine-learners.js` → `MACHINE_LEARNERS`
9. `data/evolutions.js` → `EVOLUTIONS`
10. `data/item-sprites.js` → `ITEM_SPRITES`
11. `data/sprite-metrics.js` → `SPRITE_METRICS`
12. `data/world-maps.js` → `WORLD_MAPS`
13. `data/intro-text.js` → `INTRO_TEXT`
14. `engine/stat-calculator.js` → `Stats`
15. `engine/experience.js` → `Experience`
16. `engine/catching.js` → `Catching`
17. `engine/item-use.js` → `ItemUse`
18. `engine/damage-calculator.js` → `Damage`
19. `data/conditions.js` → `CONDITIONS`, `ITEM_EFFECTS`
20. `data/battle-moves.js` → `BATTLE_MOVE_EFFECTS`
21. `engine/battle.js` → `Battle`
22. `game/random-team.js` → `RandomTeam`
23. `game/opponent-ai.js` → `OpponentAI`
24. `game/party.js` → `Party`
25. `game/evolution.js` → `Evolution`
26. `game/encounters.js` → `Encounters`
27. `game/player.js` → `Player`
28. `game/bag.js` → `Bag`
29. `game/save.js` → `Save`
30. `game/world.js` → `World`
31. `ui/screen.js` → `Screen`
32. `ui/battle-screen.js` → `BattleScreen`
33. `ui/overworld.js` → `Overworld`
34. `ui/intro.js` → `Intro`
35. `ui/game.js` → `Game` (starts the game on load)

`index.html` is the source of truth for this order, and the smoke test reads its
script list from there (skipping `ui/`, which needs a real page). If you add a
script, add it to `index.html`.

## Using the battle engine

```js
const battle = new Battle({
  seed: 1234,
  p1: { name: "Ash", team: [{ species: "Garchomp", level: 50, nature: "Jolly",
                              moves: ["Earthquake", "Outrage"] }] },
  p2: { name: "Gary", team: [{ species: "Pikachu", level: 50, moves: ["Thunderbolt"] }] }
});
battle.start();
battle.getRequest("p1");                         // what p1 may do right now
battle.choose("p1", { type: "move", move: 0 });  // move slot index or move name
battle.choose("p2", { type: "switch", index: 1 });
battle.events.map(Battle.formatEvent);           // readable battle log
```

For progression, pass `exp: true` (p1 earns experience) and `wild: true` (p1 may
also choose `{ type: "ball", ball: "great-ball" }` or `{ type: "run" }`). Team sets
can carry saved `hp`, `status`, `pp` and `exp`. See the header comment in
`engine/battle.js` for the full API.
