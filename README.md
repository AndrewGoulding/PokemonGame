# Pokémon Game

A browser Pokémon game built on a Gen 6 battle engine (single, double and tag
battles). Plain JavaScript,
no build step and no dependencies.

## Running it

Open `index.html` in a browser. FireRed's opening plays (the copyright screen,
Game Freak's shooting star, then Gengar and Nidorino's fight; Enter, Z or a tap
skips it) and leads to the title screen: Charizard, rising flames and PRESS
START. Left alone for 45 seconds the title goes back to the opening. Press
Start and FireRed's main menu comes up: CONTINUE (with your name, play time,
Pokédex and badges), NEW GAME and OPTION (B goes back to the title). The
Option screen is FireRed's too: TEXT SPEED (how long battle messages stay up),
BATTLE SCENE (OFF leaves out the hit animation), BATTLE STYLE (SHIFT: when a
trainer is about to send out their next Pokémon you may switch first; SET: no
switching), SOUND (mono, stereo or off), VOLUME (0 to 10: music, sound effects and cries),
FRAME (the menus' windows: FireRed's ten window frames; the text box is always
FireRed's message box, as in FireRed) and, from the main
menu, SAVE FILE to load a downloaded save; it's also in the Start menu. Start a
**NEW GAME** and you get FireRed's new-game intro: the controls guide, the
Pikachu pages (A turns the page, B goes back), then Prof. Oak, who shows you a Nidoran♀ and has you name
yourself before you shrink away into Pallet Town, just outside Red's house. Try
to leave town through the tall grass to the north and Prof. Oak stops you and
walks you to his lab, where Leaf is waiting; pick Bulbasaur, Squirtle or Charmander from the
Poké Balls on his table (each one shows you its Pokémon before you decide).
Leaf walks over and takes the one that's weak against yours; on your way out she walks up
to you for a practice battle, then heads off. Then Route 1's tall grass, north of town, has FireRed's wild
Pokémon. Gary's older sister Daisy, at her table next door, introduces
herself and gives you a Town Map the first time you talk to her (use it from the
bag: FireRed's map of Kanto, with you on it; move the cursor with the D-pad to
see each place's name). Red's Mom heals your party, and the PC upstairs stores items (there's a
Potion in it to start).

North of Route 1 is **Viridian City**. The Poké Mart clerk hands you Oak's
Parcel; take it back to Prof. Oak for your first five Poké Balls (new games
start without any), and after that the Mart
sells to you and the old man lying across the road north gets up and shows you
how to catch Pokémon. The Pokémon Center's nurse heals your party (and is where
you return if you black out), and its PC is FireRed's: "Which PC should be
accessed?" (Someone's PC, which becomes Bill's PC once you've helped him; your
own; Prof. Oak's PC once you have a Pokédex). Bill's PC is the Pokémon Storage
System: 14 boxes of 30 (BOX1-BOX14, each with a name and one of FireRed's 16
wallpapers), Withdraw, Deposit, Move Pokémon (pick a Pokémon up with the hand
and put it down anywhere, in a box or your party) and Move items (take, give and
swap held items), with FireRed's hand, party panel, "which BOX?" popup, box
scrolling and release. A Pokémon put in a box (or sent there when your party
is full) is fully healed, as from Gen 4 on. Your own PC is item storage: Withdraw item on FireRed's
item list, Deposit item from the Bag. There's
also a move tutor who teaches Dream Eater once, a school and the Nickname house.
Viridian's Gym is locked ("Viridian Gym's doors are locked…") until you have
the Cascade to the Volcano Badges, as in FireRed (see below).

**Controls**: the game is played with the Game Boy buttons under the text box:
the D-pad, A, B, Start and Select (tap or click them; tapping anything else does
nothing). D-pad to walk, A to talk or read signs, B to start running and again to
stop (from the start, indoors too, with FireRed's running animation), Start for
the menu. Walking into a new area (or arriving at a town, route or cave through a door),
its name hangs down from the top left for a couple of seconds, as in FireRed (the S.S. Anne's
dock reads "S.S. Anne Exterior", and every room aboard just "S.S. Anne"). In menus, the D-pad moves between choices, A picks one and B goes back;
in a summary's moves, A on one and then on another swaps them. On a keyboard: arrows / WASD, Z or Space (A), X (B), Enter, Esc or M (Start),
Backspace (Select). In battle, FireRed's own menus: FIGHT / BAG / POKéMON / RUN,
then your moves with their PP (coloured as it runs low) and type; B goes back,
and Select there ("Switch which?") swaps two moves, for good, as in FireRed.
The Pokémon's boxes are FireRed's healthboxes: name, gender, level, status icon
and HP bar (and on yours the HP in numbers and the EXP bar), sliding in as each
Pokémon comes out; the HP bar moves 1 HP a frame and the EXP bar 1 pixel a
frame as FireRed's do, your box bobs while you choose, a box shakes when its
Pokémon is hit, and its frame flashes when yours levels up.
Moves animate by kind and type with FireRed's sound effects (its own, for the
moves FireRed has one for), and so do hits, fainting, stat changes, the balls
and running (BATTLE SCENE: OFF on the Option screen turns them off); a move
that misses, fails or is blocked has no animation, as in FireRed. Text is
written out a letter at a time at your TEXT SPEED (A finishes it), and FireRed's
▼ shows when it's waiting for you.

Start opens FireRed's **menu**, a window over the map with a help bar along
the bottom (as is the text box, which is only on screen while someone's
talking). It has your Pokémon, on FireRed's party screen (each box with its
icon, which hops when chosen and moves faster the more HP it has, held item,
status, level and HP bar; A on one opens SUMMARY / SWITCH / ITEM / CANCEL:
SUMMARY is FireRed's Summary screen: POKéMON INFO (number, type, OT, ID
No., held item and the Trainer Memo: its nature and where it was met),
POKéMON SKILLS (HP and EXP bars, stats, ability), KNOWN MOVES, whose
details show each move's power, accuracy, category (Diamond and Pearl's
Physical / Special / Status icon, this game's) and description, and swap two
moves with A, and a page of this game's after it, with a fourth dot in the
page tabs: POKéMON EVs, each stat's EVs, and A switches it to POKéMON IVs and
back, with the Pokémon's happiness (out of 255) under both; up / down go through your party; SWITCH asks "Move to
where?"; ITEM gives or takes a held item). The
same screen picks a Pokémon for an item (ABLE / NOT ABLE for TMs and
evolution stones), a trade or a tutor, and for switching in battle (SHIFT, or
SUMMARY to look at a Pokémon as it is in the battle).
Then the Bag, FireRed's Bag screen with six pockets (Items, Medicine, Poké
Balls, TMs & HMs, Berries, Key Items; left / right between them, and each
pocket remembers where its ▶ was), with FireRed's descriptions under the list
(its own words and line breaks, for the items FireRed has). A opens Use / Give / Toss; Toss asks how
many and throws them away right there. It holds medicine, evolution
stones (each item for evolving says "Evolves certain Pokémon when used."), Rare Candy, vitamins, PP Ups, mints, TMs/HMs, held items, and Key Items:
the Exp. Share, Oak's Parcel, the Town Map and the fishing rods (there's no
fishing yet). After the Bag come FireRed's Pokédex (its
table of contents with Seen / Owned; the numerical list, with the caught ball and
types; the nine habitats' pages, up to four Pokémon a page in their circles;
this game's Area mode: every place with wild Pokémon (FireRed's and LeafGreen's alike; ----- until you've been
there) with how many of its Pokémon you've caught and a gold crown once you've
caught them all, and A on one lists them FireRed-style; each entry's category,
height and weight in feet and pounds, footprint, picture and description, with
Up / Down to the next one and Start for its cry; and the Area / Size page:
where it lives on the map of Kanto and how big it is next to you. Catching a
new kind shows its habitat page and entry, as in FireRed),
your trainer card (under your name: save, download or load a save file, and **Debug**, for
testing; it asks for a password the first time each session): add any Pokémon at any level (type its name, e.g. `charizard` or
`rotom-wash`; a full party sends it to the PC), infinite Rare Candies, every TM
and HM, 99 Max Repels, 99 Master Balls, a wild battle at your level, a
**Double battle** against one of FireRed's double battle trainers picked at
random (you need two Pokémon that can fight), a **Tag battle** with Leaf
against two trainers near your party's level (Leaf brings her starter, grown
with your party, Jigglypuff or Wigglytuff and Butterfree; you choose three of
yours), or a trip back to the last Pokémon Center you used (home before
you've used one).
Healing, shopping and the PC are in the towns: each Poké Mart sells exactly
what it does in FireRed (Viridian: Poké Balls, Potions, Antidotes and
Paralyze Heals), at Gen 6 prices, through FireRed's Mart: Buy / Sell / See
ya!, the buy screen with the stock and prices on the right, your money and
the map round you on the left and the item below (how many, then "That will
be ¥… Okay?"), and selling from the Bag for half price.

Battles open as in FireRed: from the map the screen flashes white twice and
slices away; the wild Pokémon slides in (in shadow) as your trainer does from
the other side, it lights up and appears, and your trainer throws your first
Pokémon's Ball. Repels (from the bag) keep wild Pokémon below your lead's level
away for 100, 200 or 250 steps; when one wears off you're asked whether to use
another of the same kind (as in Black and White). In battle you can fight, use items from the Bag (FireRed's Bag screen, Use on what
can be used right now), switch, and in wild battles
throw balls or run. Pokémon gain experience and EVs, level up mid-battle, learn
moves (with four already, FireRed's "Delete a move to make room for …?" and the
Summary screen's move list to pick one to forget) and evolve afterwards (see
**Double and tag battles** below for two-on-two), in FireRed's
evolution scene: the battle background fades to black for its swirling blue one,
sparkles spiral up and rain down, the old and new Pokémon trade places as white
shapes faster and faster, and a flash shows the new one. Hold B while they trade
places to stop it (not when a stone does it). Press A to skip ahead.
Lose (no Pokémon left that can fight) and it goes as in FireRed: in the
battle's text box, "… is out of usable Pokémon!", the money you lose (to a
trainer: "… lost against …!" and the prize money you pay) and "… blacked
out!"; the screen fades to black and, on the black screen, you scurry to the
last Pokémon Center you used (or back to Red's house before you've used one),
protecting your exhausted Pokémon; then you're there, and the nurse heals them
at the counter ("First, you should restore your Pokémon to full health.", the
healing machine, and until you've beaten Brock her advice about Potions), or
at home Red's Mom does.

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
and gate, Viridian Forest (in FireRed's shade, a little darker) with both of its gates, Route 22 and its League
gate, and Pewter City with its Gym, Museum (both floors), Poké Mart,
Pokémon Center and houses, Route 3 with its eight trainers, Route 4 with
its Pokémon Center, Mt. Moon (1F, B1F, B2F), Cerulean City with its
Pokémon Center, Gym (Misty, with Psyduck, Togepi and Starmie, the Cascade Badge and TM101
Water Pulse, FireRed's TM03), Poké Mart, Bike Shop and houses (the Badge describer, Dontae's trade
of Zynx the Jynx for a Poliwhirl, the robbed house), Route 24 (Nugget
Bridge), Route 25 with Bill's Sea Cottage, Route 5 (reached as in FireRed: through
the hole in the robbed house's back wall, past the Rocket in its yard) with the
Day-Care, the Underground Path's north entrance (Saige trades Ms. Nido, a
Nidoran♀, for a Nidoran♂; the tunnel itself isn't built) and the gate to
Saffron City (its thirsty guard turns you back), Route 9 with its nine
trainers (behind a small tree you need Cut for, as in FireRed), the Underground
Path's tunnel and south entrance, Route 6 with its six trainers and its gate to
Saffron, and Vermilion City: its Pokémon Center, Poké Mart, Gym (behind a Cut
tree, as in FireRed), the Fishing Guru's house, Elyssa's trade house, the
Pidgey house, the Pokémon Fan Club and the S.S. Anne: all its decks and cabins
(1F, 2F, 3F, B1F, the kitchen, the deck and the Captain's office) with their
trainers and items, Route 11 with its ten trainers and its gate (on to Route
12, below the sleeping Snorlax), Diglett's Cave from Route 11 to Route 2's
east side, and Route 10 east of Route 9: its trainers, its Pokémon Center (Prof.
Oak's aide gives the Everstone for twenty kinds caught; Fly can land outside
it), and Rock Tunnel (1F and B1F, dark without Flash, with its fifteen trainers,
items, Rock Smash rocks and the Rock Slide tutor, ₽1,000 a time as often as you like; its floors are numbered in the area name popup), and Lavender Town: its
Pokémon Center, Poké Mart (Super Repels and Revives), the Name Rater (renames
a Pokémon you caught yourself; one you traded for keeps its name), Cubone's
house and the Volunteer Pokémon House (Mr. Fuji is away until Pokémon Tower),
Pokémon Tower (1F-7F, FireRed's mist drifting over 3F-7F: Gary on 2F, with FireRed's team, a Gyarados in Kadabra's place and his Eevee, now an Umbreon; the
Channelers; 5F's purified zone, which heals you each time you step in; without
the Silph Scope its wild Pokémon are unidentified Ghosts (FireRed's
BATTLE_TYPE_GHOST: "A wild Ghost appeared!", your Pokémon are too scared to
move, the Ghost says "Get out…… Get out……", balls are dodged and running always
works), and on 6F the ghost of Cubone's mother pushes you back; with the Silph
Scope she's a Marowak (Lv. 30) whose spirit you calm (or, this game's own,
catch: she's at rest all the same and the way up is clear), then the
Rockets on 7F and Mr. Fuji, who takes you home and gives you the Poké Flute,
which wakes sleeping Pokémon), Route 8 (its trainers; the twins Eli & Anne,
a double battle, as in FireRed), its gate to Saffron (a thirsty
guard), and the Underground Path's east entrance and tunnel, and its west
entrance onto Route 7, with its gate to Saffron, and Celadon City: its Pokémon
Center, the Department Store (five floors and the roof; the elevator takes you
to any floor: FireRed's floor list and its "Now on:" window, and the car shakes
while it hums, then dings; the 2F TM counter, the 4F toys and stones, the 5F drugstore; the
Counter tutor on 3F; on the roof, vending machines with Fresh Water, Soda Pop
and Lemonade (FireRed's list with the prices, and your money in its box at the
top left), and a thirsty girl who swaps TM16 Light Screen, TM20 Safeguard or
TM33 Reflect for a drink she hasn't had), the Condominiums (the old lady's Tea:
give it to any of the thirsty gate guards and all four gates to Saffron open;
the game designer's diploma for a complete Kanto Pokédex; an Eevee, Lv. 25, in
a Poké Ball in the rooftop room), the restaurant (the Coin Case), the hotel and
houses, the Soft-Boiled tutor, Erika's Gym (behind a Cut tree; the Rainbow Badge
and TM19 Giga Drain, TM103 here), and the Game Corner: buy Coins (50 for ₽1,000,
500 for ₽10,000, in FireRed's list, with your money and Coins in their boxes at
the top left; up to 9,999 in the Coin Case), get a few from the gamblers,
find them on the floor, and play FireRed's slot machines (its reels, odds,
lines and payouts, from `src/slot_machine.c`); spend them in the Prize Room on
Abra, Clefairy, Dratini, Scyther or Porygon, TMs (Ice Beam, Thunderbolt, Shadow
Ball, Flamethrower, and Iron Tail, TM104 here, since this game's TM23 is Smack
Down) or held items, each counter's prizes in FireRed's list with your Coins
in their box. Beat the Rocket guarding the poster and the switch behind
it opens the stairs to the Rocket Hideout (B1F-B4F: its trainers, items and
spinning arrow floors; FireRed's TM49 Snatch, TM107 here; the barriers that open once their guards are beaten; the
Lift Key a Rocket drops on B4F, which works the elevator; and Giovanni: as you
speak to him Leaf comes running in from the elevator's side, investigating Team
Rocket since she heard about the Game Corner, and the two of you take him on in
a tag battle (she brings her Butterfree, Wigglytuff and starter from the top of
Pokémon Tower, you three of yours; Giovanni has FireRed's Onix, Rhyhorn and
Kangaskhan and, against two, a Dugtrio, Nidorino and Persian too). Beaten, he
leaves the Silph Scope behind, which lets you finish Pokémon Tower, and Leaf
heads back out).
Through any of the four gates you reach Saffron City, Team Rocket's town until
Silph Co. is freed (Rockets stand in the doorways of the Copycat's house, the
house and the Gym, and a "security guard" in Silph's own until Mr. Fuji's
rescued, then naps beside it): its Pokémon Center, the Poké Mart, the Copycat's
house (bring her a Poké Doll and she teaches Mimic), Mr. Psychic (TM29 Psychic),
the Pokémon Trainer Fan Club, the Fighting Dojo (its Black Belts and the Karate
Master, who turns to face you as you pass him; beaten, he lets you take
Hitmonlee or Hitmonchan, Lv. 25, and the other stays on its shelf), and
Sabrina's Gym, a maze of warp pads you spin away on (the Marsh Badge and TM04
Calm Mind). Silph Co., 1F to 11F: its Rockets and scientists, its items, the
warp pads between floors and rooms, the elevator, and locked doors that the Card
Key from 5F opens for good; the Thunder Wave tutor on 2F, a nap on 9F, Gary on 7F
(Pidgeot, Growlithe, Gyarados, Exeggutor, Umbreon and an Alakazam holding its
Alakazite, which Mega Evolves; Lv. 35-40) and the Silph worker there who gives
you a Lapras, Lv. 25; and Giovanni in the boardroom on 11F, where Red comes down
by the warp pad and, without a word, stands beside you for a tag battle (his
Charizard, holding Charizardite X, Snorlax and Pikachu, Lv. 36; Giovanni has
FireRed's team, his Kangaskhan holding its Kangaskhanite, and both Mega
Evolve): beat him and Team Rocket leaves Silph and Saffron, Red heads back the
way he came, the townsfolk come back out, and the President gives you the
Master Ball. The Silph Co. 5F TM01 (Focus Punch) is TM105 here.
South of Lavender Town, Route 12 (its gate, with TM27 Return from the girl
upstairs; the fishermen along the pier; the Fishing Guru's younger brother's
house, with the Super Rod and his Magikarp size record, FireRed's, for a Net Ball)
is blocked by a sleeping Snorlax: play the Poké Flute to wake it, and it attacks,
a wild Snorlax, Lv. 30, you can catch; beaten or not, it's gone. Routes 13, 14 and
15 (their trainers, Cut trees and hidden items; Route 15's gate, where Prof.
Oak's Aide has the Exp. Share for fifty kinds caught and the binoculars show
Articuno) lead west to Fuchsia City: its Pokémon Center, the Poké Mart, the
Substitute tutor, the Pokémon statues' signs, the Fishing Guru's older brother
(the Good Rod), Bill's grandfather's house, the Move Deleter, the Safari Zone
office, the Warden's house (bring back his Gold Teeth, lost in the Safari Zone,
for HM04 Strength) and Koga's Gym, its invisible walls between you and him (the
Soul Badge, which lets you Surf, and TM06 Toxic). The Safari Zone: ₽500 at the
gate buys the Safari Game, 30 Safari Balls and 600 steps in its four areas
(Center, East, North, West) and their rest houses, with their items and the
Secret House's prize, HM03 Surf. Every wild Pokémon there is a Safari battle,
as in FireRed: your Pokémon stay in their balls and each turn you throw a
Safari Ball, Bait (it's less likely to flee, but harder to catch) or a Rock
(more likely to flee, easier to catch), or run; it watches you, or runs away,
by FireRed's catch and escape factors and each species' Safari flee rate
(`engine/safari.js`). The Start menu shows your steps and balls and can RETIRE;
out of steps or balls, the PA calls time and you're back at the gate, and
walking back into the gate early, you're asked if you're leaving. FireRed's
Route 12 TM48 (Skill Swap) is TM106 here.
West of Celadon City, Route 16 is blocked by a second sleeping Snorlax (the
Poké Flute again, a wild Lv. 30 Snorlax, and Leftovers hidden where it slept);
past a Cut tree to the north, a girl's secret retreat, with her Fearow, where she
gives you HM02 Fly; and Route 16's gate, where upstairs Prof. Oak's Aide has the
Amulet Coin for forty kinds caught (held by a Pokémon that battles, it doubles the
prize money) and the binoculars look out over Celadon and the sea. Its lower
passage is Cycling Road's: without a Bicycle the guard calls you back to the
counter ("No pedestrians are allowed on Cycling Road!"), and with one you're put
on it as you ride out, and can't get off until you leave the road through a gate
(or Fly away). Cycling Road runs from Route 16's Bikers and Cue Balls down the
whole of Route 17, a slope as in FireRed: on it you coast downhill at full speed
unless you press another way (you pedal that way at walking pace) or hold B (you
stay where you are); its trainers, signs and hidden items (Rare Candy, Full
Restore, PP Up, Max Revive, Max Elixir) along the way. At the bottom, Route 18
(its Bird Keepers) and its gate, where Haden upstairs trades his Lickitung, Marc,
for a Golduck, lead east into Fuchsia City.
South of Fuchsia City, Route 19's beach and its swimmers lead out to sea (Surf
from here on), west along Route 20 (its swimmers, picnickers and hidden
Stardust) past the Seafoam Islands to Cinnabar Island. The Seafoam Islands (1F
to B4F, their wild Pokémon on land and water, and their items) are FireRed's
puzzle: with Strength, push a boulder into a hole and it drops through, turning
up on the floor below (FireRed's reveal flags; you can drop after it); on B3F
and B4F fast currents carry you along while you surf (MB_*_CURRENT), and fall
in through a hole and the current sweeps you off, from B3F down to B4F, and on
B4F to the shore, until two boulders have been dropped into each current's way:
come back to that floor and the current has stopped for good (FireRed's
current-stopped layouts). Until then, passing through Route 20 puts the
boulders back where they started (`game/seafoam.js`). Deep inside, Articuno
waits, a wild Lv. 50 Articuno to the legendary battle music: beat it or catch
it and it's gone; run, and it flies away until you come back. Cinnabar Island:
its Pokémon Center (a respawn point and Fly spot), Poké Mart, and the Pokémon
Lab, where the fossil doctor revives a Helix Fossil, Dome Fossil or Old Amber
into a Lv. 5 Omanyte, Kabuto or Aerodactyl once you've left the room and come
back, the Metronome tutor, and three trades (Garett's Seel, Seelor, for a
Ponyta; Clifton's Electrode, Esphere, for a Raichu; Norma's Tangela, Tangeny,
holding Stardust, for a Venonat; FireRed's IVs and trainers). The Pokémon
Mansion (1F to 3F and B1F, in FireRed's shade: its burglars and scientists, its diaries, its items,
TM14 Blizzard and TM22 Solar Beam among them): every statue hides the one
switch that swaps which of the house's doors are open, on every floor, and the
Secret Key lies in the basement. Blaine's Gym is locked until you have it.
Inside, at each quiz machine answer FireRed's question right and the door ahead
opens; get it wrong and its trainer comes over to battle you (beating them
opens it too). Blaine gives the Volcano Badge and TM38 Fire Blast, and beating
him beats his Gym's trainers. (In FireRed, Bill then waits on Cinnabar to take
you to the Sevii Islands, which aren't built: he isn't there.) From Cinnabar,
Route 21 runs north across the sea, its fishermen and swimmers, to Pallet Town.
Off Route 10's waterway, the Power Plant (Surf along the river to its doors): its wild
Pikachu, Voltorb, Magnemite, Magneton and Electabuzz, its items (TM17 Protect, TM25
Thunder, a Thunder Stone, two hidden), two "item balls" that are Electrode
(a wild Lv. 34 Electrode with its cry; gone once fought), and Zapdos, a wild
Lv. 50 Zapdos as Articuno is. With the Cascade to the Volcano Badges, Viridian
City's Gym opens (FireRed's TryUnlockGym doesn't check the Boulder Badge) and
the old man outside says its Leader has returned: FireRed's spinning-arrow
maze, its Tamers, Black Belts and Cooltrainers, and Giovanni, its Leader all
along (FireRed's team). Beaten, he gives the Earth Badge and TM26 Earthquake,
his Gym's trainers count as beaten, and the Rockets left around Kanto are gone;
talk to him again and he says Team Rocket is finished forever, and he's gone
too. On Route 22, Gary is waiting once more on your way to the League (FireRed's
late rival, with the same triggers): his Silph Co. team at FireRed's levels here,
Pidgeot (47), Growlithe (45), Gyarados (45), Exeggutor (45), Umbreon (53, his
ace) and Alakazam (47), which Mega Evolves with its Alakazite; losing blacks you
out. Past the League gate's guard (Boulder Badge), Route 23's seven guards each
check one Badge in order, Cascade to Earth: walk up to the next one and he
stops you (and sends you back a step) until you've shown it (FireRed's
VAR_MAP_SCENE_ROUTE23; talking to a guard checks his Badge), up to the Victory
Road gate (its hidden berries and items, its wild Pokémon). Victory Road (1F to
3F): its Cooltrainers, Black Belt, Jugglers, PokéManiac, Tamer and Cool Couple
Ray & Tyra (a double battle), its items (TM02 Dragon Claw, TM07 Hail, TM37
Sandstorm, TM50 Overheat among them), the Double-Edge tutor, and FireRed's
Strength puzzle: push a boulder onto a floor switch and that floor's rock
barrier crumbles (FireRed's setmetatile, as patches); the boulders go back
where they were when you leave a floor, the barriers stay down until you pass
through Route 23 again, and 3F's boulder drops through a hole to 2F
(`game/league-road.js`). Out the far side and up Route 23 is the Indigo
Plateau: its Pokémon Center (a respawn point and Fly spot, its Mart, the
nurse); the guard at the Elite Four's door wishes you luck, but the Pokémon
League beyond isn't built yet, nor is Cerulean Cave. Tiles, palettes and metatiles come from
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

### Music and cries

FireRed's own music, played by a re-creation of its sound engine
(`game/m4a.js`: the m4a / MusicPlayer2000 engine from pret's `src/m4a.c` and
`src/m4a_1.s`, at 13,379 Hz with its envelopes, vibrato, five sample channels,
the Game Boy square / wave / noise channels and its reverb). Each map plays its
song; wild, trainer and Gym Leader battles have their themes and victory
music; trainers' "eyes meet" themes, the rival and Team Rocket themes, Prof.
Oak's, the title screen, the opening movie and his speech all play; and the
heal, level-up, item, catch and evolution jingles play over the music.
Pokémon cry when they come out, faint (lower), evolve, or open their summary
(FireRed's cries, for the first 386). Sound starts at your first key press or
tap (browsers' rule), and can be turned off on the Option screen (SOUND: OFF).

`tools/build-audio.js` packs the songs (their MIDI events and settings from
`midi.cfg`), FireRed's instruments (voicegroups, key splits, samples and
programmable waves) into `assets/audio/music.js`, loaded only once sound is
needed, and copies the cries into `assets/audio/cries/`:

```sh
cd pokefirered && git sparse-checkout add sound/ && cd ..
node tools/build-audio.js pokefirered
```

### Town Map

`tools/build-town-map.js` renders FireRed's Kanto region map into
`assets/town-map/` and writes `data/town-map.js` (the grid of places, their
names, and which place each map is in):

```sh
cd pokefirered && git sparse-checkout add graphics/region_map/ src/data/region_map/ && cd ..
node tools/build-town-map.js pokefirered     # after build-maps.js
```

### Party screen

`tools/build-party-menu.js` converts FireRed's party screen
(`graphics/party_menu/`, the status icons, the CONFIRM / CANCEL buttons for
choosing several Pokémon) into `data/party-menu.js`, and
writes every Pokémon's party icon to `assets/sprites/icons/`: FireRed's own for
the first 386, in their icon palettes, and the later ones and alternate forms
(Megas, Rotom's appliances, ...) from pokeemerald-expansion, which has them
in the same style:

```sh
cd pokefirered && git sparse-checkout add graphics/party_menu/ graphics/interface/ graphics/pokemon/icon_palettes/ \
  /src/pokemon_icon.c '/graphics/pokemon/*/icon.png' '/graphics/pokemon/*/*/icon.png' && cd ..
git clone --depth 1 --filter=blob:none --sparse https://github.com/rh-hideout/pokeemerald-expansion expansion
cd expansion && git sparse-checkout set --no-cone '/graphics/pokemon/**/icon*.png' '/graphics/pokemon/icon_palettes/*' \
  '/src/data/pokemon/species_info/*' '/src/data/graphics/pokemon.h' && cd ..
node tools/build-party-menu.js pokefirered expansion
```

`tools/order-learnsets.js` puts moves learned at the same level in
`data/learnsets.js` in the games' order (X and Y's, from the expansion's
`src/data/pokemon/level_up_learnsets/gen_6.h`), so a new Charmander knows
Scratch, then Growl:

```sh
cd expansion && git sparse-checkout add '/src/data/pokemon/level_up_learnsets/*' && cd ..
node tools/order-learnsets.js expansion
```

`tools/build-summary.js` converts FireRed's Summary screen and Move Relearner
(`graphics/summary_screen/`, `graphics/interface/`) into `data/summary-screen.js`,
with short descriptions for every move and ability (FireRed's, and the
expansion's for later ones), and a Fairy type icon (FireRed has none: lettered
from the expansion's `graphics/types/fairy.png`, in FireRed's style, in place of
its "???" icon):

```sh
cd pokefirered && git sparse-checkout add graphics/summary_screen/ graphics/learn_move/ /src/move_descriptions.c \
  /src/data/text/abilities.h && cd ..
cd expansion && git sparse-checkout add /src/data/moves_info.h /src/data/abilities.h \
  /graphics/interface/category_icons.png && cd ..
node tools/build-summary.js pokefirered expansion
```

`tools/build-pc.js` converts FireRed's PC screens (`graphics/pokemon_storage/`,
with its 16 wallpapers, and `graphics/item_pc/`) into `assets/pc/`:

```sh
cd pokefirered && git sparse-checkout add graphics/pokemon_storage/ graphics/item_pc/ && cd ..
node tools/build-pc.js pokefirered
```

`tools/build-healthbox.js` converts FireRed's battle healthboxes
(`graphics/battle_interface/healthbox_*`, the singles, Safari Zone and smaller
double battle ones) into `assets/battle-interface/`:

```sh
node tools/build-healthbox.js pokefirered
```

`tools/build-shop.js` converts FireRed's Poké Mart buy screen
(`graphics/shop_menu/`) into `assets/shop/`:

```sh
cd pokefirered && git sparse-checkout add graphics/shop_menu/ && cd ..
node tools/build-shop.js pokefirered
```

`tools/build-pokedex-screen.js` converts FireRed's Pokédex screens
(`graphics/pokedex/`, the footprints, `src/data/pokemon/pokedex_categories.h`,
the size comparisons and area markers) into `assets/pokedex/` and
`data/pokedex-screen.js`:

```sh
cd pokefirered && git sparse-checkout add graphics/pokedex/ graphics/interface/ && cd ..
node tools/build-pokedex-screen.js pokefirered
```

`tools/build-bag.js` converts FireRed's Bag screen (`graphics/item_menu/`, the
bag and arrow sprites in `graphics/interface/`) into `assets/bag/`, and
`tools/build-item-descriptions.js` FireRed's item descriptions
(`src/data/items.json`) into `data/item-descriptions.js`:

```sh
cd pokefirered && git sparse-checkout add graphics/item_menu/ /src/data/items.json && cd ..
node tools/build-bag.js pokefirered
node tools/build-item-descriptions.js pokefirered
```

`tools/build-evolution.js` converts FireRed's evolution scene
(`graphics/evolution_scene/`: the swirling background's tiles and tilemaps, and
the sparkle) into `data/evolution-scene.js` and `assets/evolution/`:

```sh
cd pokefirered && git sparse-checkout add graphics/evolution_scene/ && cd ..
node tools/build-evolution.js pokefirered
```

### Main menu and Option screen

`tools/build-menus.js` converts what they're drawn with into
`data/gba-menus.js`: FireRed's fonts (with their letter widths from
`src/text.c`), the character map, the button icons, the eleven window frames,
the Start menu's help bar, the battle menus' panels and the menus' palettes;
it also writes the battle message box (`assets/battle-interface/`), the
field message box every other text is written in and its ▼ (`assets/text/`). `tools/build-pokedex.js` writes
`data/pokedex-text.js`, the Pokédex's categories and FireRed descriptions:

```sh
cd pokefirered && git sparse-checkout add graphics/fonts/ graphics/text_window/ graphics/main_menu/ graphics/misc/ \
  graphics/help_system/ graphics/battle_interface/ graphics/interface/ src/text.c src/data/pokemon/ charmap.txt && cd ..
node tools/build-menus.js pokefirered
node tools/build-pokedex.js pokefirered
node tools/build-font.js          # FireRed's text font as assets/fonts/firered.otf (needs npm install: opentype.js)
```

All the game's text is in FireRed's own font (`tools/build-font.js` turns its
glyphs, a pixel a square with FireRed's letter widths, into a web font); the
text box is FireRed's size, a game pixel a pixel, with its shadow.

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
either is as likely. The three starters are out in the wild, 5% each: Bulbasaur in Viridian Forest, Charmander on Route 3 and Squirtle on Route 24. FireRed's TMs found in item balls become this game's
machine for the same move (TM09 Bullet Seed is TM100 here). An Escape Rope works
where FireRed allows it (caves, Viridian Forest) and takes you back to where
you last went from outdoors through a door or cave entrance. Trainers work as in FireRed: one you haven't beaten sees you
straight ahead within their sight range (nothing in between), shows "!",
walks up and battles with their FireRed party (fixed IVs, set moves where
FireRed sets them); beaten, they say their after-battle line, and one that walked over to you stays
where they stopped until you leave the map; come back and they're home again,
doing what they did before. Those that turn
(`face_down_and_up`, `look_around`) can spot you as they turn. Hidden items
are found by pressing A facing their tile. Water, its edges and the flowers move as in FireRed (its General tileset's
animations and timing; `tools/build-maps.js` draws each animated 8x8 cell in
every frame into `assets/world/maps/<Map>-anim.png`). Battles use the map's own FireRed
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
afterwards (she waits a few steps from the door, sees you and walks over) for a battle (Butterfree, her starter and a Jigglypuff; beat her and she gives you TM54 False Swipe), the Mega Punch and Mega Kick tutors (who teach
again and again, for ₽1,000 each time), the
Magikarp salesman, Super Nerd Miguel and the Mt. Moon fossils, Jessie & James
climbing down the last ladder in Mt. Moon as in Yellow, Gary in Cerulean (FireRed's team, with
his Eevee), the Nugget Bridge Rocket (a Nugget, then a battle), the Rocket in
the robbed house's yard (beat him and he gives back TM28 Dig), the Day-Care
Man (`game/daycare.js`: one Pokémon gains 1 Exp. Point a step, learning its
new moves; ₽100 plus ₽100 a level to take it back), small trees you can Cut
down until you leave the map, Vermilion's pier sailor checking for your S.S. Ticket, Lt.
Surge's Gym (the switches under its fifteen trash cans: the first is under any
of them, the second under one next to it, and a wrong second can resets both;
the electric beams are FireRed's metatiles, swapped in as `<Map>-patch-*.png`
from `MAP_PATCHES` in `tools/build-maps.js`) with Lt. Surge (Voltorb, Pikachu and
Raichu, the Thunder Badge and TM34 Shock Wave, this game's TM102), the Fishing
Guru's Old Rod (there's no fishing yet), Elyssa's trade (Ch'Ding the
Farfetch'd for a Spearow), the Fan Club Chairman's Bike Voucher and the Bike
Shop's Bicycle for it, Leaf waiting where the road from
Route 6 comes into Vermilion (Butterfree 18, Wigglytuff 20, Nidorina 21 and her
second-stage starter 22), Red on the S.S. Anne where FireRed has Gary (Pikachu
24, Charmeleon, Wartortle and Ivysaur 25), the seasick Captain's HM01 Cut, the
ship sailing off when you next step onto the dock, Turner's trade in Route 11's
gate (Nina the Nidorina for a Nidorino), Prof. Oak's aide there with the
Itemfinder for thirty kinds of Pokémon caught (use it from the Bag: within 7
steps across and 5 up or down of a hidden item it responds and you turn toward
the nearest; standing on one, you dig it up), the woman in Vermilion's
Pokémon Center with the VS Seeker (use it from the Bag once charged by 50
steps, half FireRed's 100: trainers on screen you haven't beaten show "!", and
ones you have always want a rematch, "!!"; they stop where they are, facing the
way they were (as FireRed does, so wanderers stop wandering), and battle you
again, with the same team, until you beat them or leave the map), the woman on
the S.S. Anne who lets you rest (the screen goes black while the healing jingle
plays, as with Red's Mom), the Tradeback Guy upstairs
in every Pokémon Center (he trades your Pokémon and straight back, so trade
evolutions happen), and Bill: a
Clefairy until you run his Teleporter's Cell Separator, then he gives you the
S.S. Ticket and his PC shows his favourite Pokémon) are in `ui/game.js`; their FireRed
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

### Double and tag battles

FireRed's double battle trainers (its `trainerbattle_double`: Route 8's twins
Eli & Anne, Route 12's and Route 16's young couples, Route 14's twins Kiri &
Jan, Route 15's Crush Kin Ron & Mya, Route 19's and Route 21's Sis and Bro)
battle you two on two, with your whole party. They need you to have two
Pokémon that can fight: without them, talking to one gets their "not enough
Pokémon" line (Eli: "We can't battle if you don't have two Pokémon.") and they
don't come after you when they see you. Win and you get their prize money
doubled, as in FireRed.

A double battle looks as FireRed's: the trainer's picture slides away and both
their Pokémon come out ("Twins Eli & Anne sent out Clefairy and Jigglypuff!"),
then yours ("Go! Pikachu and Charizard!"), at FireRed's double battle places
(yours left and right in front, theirs side by side further back), each with
FireRed's smaller double battle healthbox (name, level and HP bar; no HP
numbers or EXP bar, as in FireRed). Each turn it asks "What will … do?" for
each of your Pokémon in turn, its box bobbing; B on the second goes back to
the first (not after the first chose an item). A move that aims at one
Pokémon brings up FireRed's target cursor: the target blinks and its box
bobs, Left / Up and Right / Down step round the Pokémon it can reach (your
left one, your right one, their right one, their left one; the cursor starts
on their left one), A picks and B goes back to the moves. While a move that
hits several Pokémon (Surf, Earthquake, Discharge, Heat Wave, Rock Slide, ...)
or your side or the field is chosen in the move menu, the Pokémon it will hit
flash white. A move with only one Pokémon it could hit just goes. POKéMON
switches that slot's Pokémon (one your other Pokémon is already switching to
"has already been selected"), BAG uses an item (an X item on that Pokémon),
and Mega Evolution (START in the move menu) is for one of your two a turn,
once a battle. When Pokémon faint, the party screen asks for a replacement for
each empty slot at the end of the turn. Experience goes to each of yours that
was out while the fainted foe was. (There's no Shift in a double battle.)

In a **tag battle** (Giovanni in the Rocket Hideout, with Leaf, and in Silph
Co., with Red; and the debug menu's Tag battle) you fight beside a partner,
against one trainer or two. First choose
three of your Pokémon on FireRed's party screen for choosing several: A on a
Pokémon gives ENTER (NO ENTRY takes it back), SUMMARY and CANCEL; the chosen
ones say FIRST, SECOND and THIRD, the rest ABLE or NOT ABLE; choosing the
third (or START) moves the cursor to OK, and OK with too few says "Three
POKéMON are needed." B or CANCEL asks "Cancel the battle?". Your partner stands
beside you and sends out theirs as you send yours ("Leaf sent out Ivysaur!
Go! Pikachu!"); you choose for your Pokémon only, your partner picks their own
moves, and each side's slots are refilled from their own trainer's party
(someone with no Pokémon left "is out of usable Pokémon!" and their slot stays
empty). Two opposing trainers slide in side by side ("Youngster Ben and Lass
Janice would like to battle!"), each sends out their own, and each says their
piece when you win, and you get each one's prize. Only the three you chose
are changed by the battle (HP, PP, experience, levels); the rest of your party
is left as it was.

### Prof. Oak's Mega Evolution test

This game's own story beat. Once you have four badges and Pokémon Tower is put
to rest (Mr. Fuji rescued), one of Prof. Oak's aides finds you as you next come
out of a building (outside the Gym or Mr. Fuji's house, whichever came second):
he comes along the paths from just off the screen, and goes back the way he
came, and sends you to the top of Pokémon Tower. There Prof. Oak and Mr. Fuji
stand at the top, and Leaf, Gary and Red wait in a line before them; you walk
up the middle to stand before Oak, and everyone faces him as he explains: he
has been studying Mega Evolution and tests everyone. One at a time, each steps
out of the line, walks over to you and battles you, then goes back to their
place: Leaf (Butterfree, Wigglytuff, Nidorina, then Vulpix, Gloom or Poliwhirl
by her starter, then her starter's second stage; Lv. 27-31), Gary (Pidgeotto,
Growlithe, Gyarados, Exeggutor, Umbreon) and Red (Pikachu, Charmeleon,
Wartortle, Ivysaur, Espeon), and you're healed before each battle. You have to
win all three: lose one and you black out as usual, and the test starts over
when you come back. Win them all and you step up to Oak for the Mega Ring and
the Kanto starters' Mega Stones (Venusaurite, Charizardite X and Y,
Blastoisinite), and step back. Then Red (without a word), Leaf and Gary (each
with a parting word) go down the stairs, Oak heads back to his research, and
only then does Mr. Fuji come over: impressed by your battling, he gives you the
Gengarite and goes home to the Pokémon House.

With the Mega Ring, a Pokémon holding its Mega Stone can Mega Evolve once a
battle: in the move menu, START switches Mega Evolution on ("MEGA EVOLVE: ON")
for the move you pick. (FireRed has no Mega Evolution; trainers holding a Mega
Stone already could.)

## Progression rules (Gen 6)

- **Experience**: the six growth curves, and base exp × level / 7 split between
  the Pokémon that battled, ×1.5 from trainers and with a Lucky Egg. Catching a
  Pokémon also gives experience. EVs come from the defeated species' yield.
  With the **Exp. Share** on (a key item you start with; use it from the bag to
  switch it off and on), each Pokémon that battled gets the full amount
  instead of a split, and the rest of the party (not fainted) gets half, plus
  EVs, as in X and Y.
- **Shiny Pokémon**: any Pokémon you meet or are given is shiny 1 time in 1,000
  (trainers' never are). They use their shiny sprites
  everywhere, sparkle as they come out in battle, and have a ★ on their
  summary. (The debug menu's Add a Pokémon has a Shiny box.)
- **Move Relearner and Move Deleter**: they sit on the cushions upstairs in
  every Pokémon Center. The Relearner teaches a Pokémon a level-up move
  it could know by now (its own, or one its earlier forms learn by its level,
  so evolving early never loses a move), for a Heart Scale (dig them up with the Explorer Kit),
  on FireRed's Move Relearner screen; with four moves already, you pick one to
  forget on the Summary screen's move list, as for TMs and tutors;
  the Deleter makes it forget a move, free.
- **Explorer Kit** (a key item you start with): use it from the bag in a cave
  (Mt. Moon) to dig in the wall, as in Diamond and Pearl's Underground. Hit
  tiles (the D-pad and A, or tap / click them; B or tapping the tool switches
  it) with the Pickaxe (1 energy) or the wider Hammer (2 energy) to clear
  the rock (1-6 layers; grey bedrock can't be dug) and uncover buried
  treasures (2 up to mining level 10, 3 up to 20, then 4). The dig ends when every treasure is out (they go in your bag) or
  your energy runs out (40 at mining level 1, and 2 more each level: 238 at
  level 100). What a hit dug up is told under the board until the next hit.
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
- **The Safari Zone** (`engine/safari.js`, FireRed's): a species' catch factor
  is its catch rate × 100 / 1275 and its escape factor its Safari flee rate ×
  100 / 1275 (at least 2). Bait halves the catch factor (at least 3) and makes
  it eat for 2-6 turns, fleeing at a quarter the rate; a Rock doubles it (at
  most 20) and angers it for 2-6 turns, fleeing at twice the rate (at most 20);
  it flees with the rate × 5 percent each turn, deciding as the turn starts.
  A Safari Ball (×1.5) uses FireRed's catch odds and four shake checks.
- **Running**: always escapes if faster; otherwise speed × 128 / foe speed +
  30 per attempt, out of 256.
- **Happiness** (friendship, 0-255; engine/experience.js `adjustFriendship`):
  FireRed's AdjustFriendship. Each change depends on how friendly the Pokémon
  is now (under 100 / under 200 / 200+): a level up +10/+6/+4 (double
  FireRed's; in battle or by Rare Candy, not the Day-Care's), a vitamin, PP Up or PP Max +5/+3/+2, an X
  item in battle +1/+1/0, a TM or HM learned +1/+1/0, a battle with a Gym
  Leader, the Elite Four or the Champion +3/+2/+1 for the whole party, every
  200 steps +2 for each Pokémon (FireRed: +1 every 128 steps, half the time), fainting in battle −1 (−5/−5/−10
  against a foe 30+ levels higher), and the bitter herbs (Energy Powder and
  Heal Powder −5/−5/−10, Energy Root −10/−10/−15, Revival Herb −15/−15/−20). A
  gain is half again with a Soothe Bell held, and one more in a Luxury Ball and
  one more in the area where it was met.
- **Evolution**: `data/evolutions.js`, generated from Pokémon Showdown's Gen 6
  data by `npm run build:evolutions` (needs `npm install` first). Level,
  friendship (220+), time of day, held item, known move, gender, party and
  stat conditions all work. Stone and trade evolutions are in the data but
  need the bag and trading, which come later. A few conditions this game can't
  model yet (Moss Rock, magnetic fields, rain, an upside-down console) are
  swapped for the nearest playable rule; each has a `note` explaining it.

- **Types**: Gen 6's, except Aerodactyl (Dragon/Rock), Gyarados and Mega
  Gyarados (Dragon/Water), Psyduck and Golduck (Water/Psychic), and Blastoise
  and Mega Blastoise (Water/Steel).
- **Moves**: Gen 6's, except Leech Life, which is Gen 7's (80 power, 10 PP), plus
  Gen 7's Instruct and Spotlight for double battles (no Pokémon learns them).
- **X items**: X Attack, Defense, Sp. Atk, Sp. Def, Speed and Accuracy raise
  that stat of the Pokémon in battle one stage (Gen 6).
- **Items**: Gen 6 effects for potions and drinks, status cures, Revives, PP
  restores, vitamins (10 EVs each, up to 100) and Rare Candy. In battle, using
  an item takes your turn and happens before moves.
- **HMs**: one set for every region: HM01 Cut, HM02 Fly, HM03 Surf, HM04
  Strength, HM05 Flash, HM06 Whirlpool, HM07 Waterfall, HM08 Rock Smash,
  HM09 Dive, HM10 Defog, HM11 Rock Climb.
- **Field moves** (`game/field-moves.js`): FireRed's seven, Flash, Cut, Fly,
  Strength, Surf, Rock Smash and Waterfall, each with the Gym Badge FireRed asks
  for (Boulder, Cascade, Thunder, Rainbow, Soul, Marsh, Volcano). A Pokémon can
  use one if it knows the move, or if you have the HM in the Bag and it could
  learn the move from it, so nothing has to give up a move slot. On the party
  screen a Pokémon's menu lists every one of them it knows or could learn, in
  FireRed's blue, with FireRed's line about it ("Travel on water.") while it's
  chosen (more than fit scroll). Picking one says why not ("This can't be used
  until a new Badge is obtained.", "You need HM03 Surf to use Surf.", "No
  surfing here!", "There's nothing to Cut.") or uses it: Cut a tree in front of
  you, Flash in a dark cave (`requires_flash`: dark but for a circle around you,
  which opens up), Fly from outdoors to any town you've been to (the Town Map,
  with the places marked; you land outside its Pokémon Center, FireRed's heal
  locations, and Route 4's Center counts once you've been in), Strength (push
  boulders until you leave the map), Surf onto the water in front of you, Rock
  Smash a rock in front of you (a Pokémon may be hiding under it), Waterfall up
  the falls while surfing. A in front of a tree, a rock, a boulder, the water
  or a waterfall asks as FireRed does when someone in the party can.
  Surfing: the surfing music and sprite, twice walking speed, the map's water
  Pokémon (FireRed's `water_mons`, 60/30/5/4/1%, kept out of the Pokédex's
  area pages and route crowns for now), and walking onto land hops you off.
- **The Bicycle** (from the Bag, or Select once it's registered: key items
  you can use on the map can be registered to Select, Backspace on a
  keyboard): riding sprite and cycling music, Emerald's Mach Bike speed, half as
  fast again (it picks up speed going straight: 1.5 times walking pace, then running
  pace, then 6 pixels a frame;
  stopping, turning or bumping into something starts over), wild Pokémon 80% as often (FireRed's rate on a bike), and only
  where FireRed allows cycling (`allow_cycling`): going indoors gets you off,
  and using it indoors gets "Oak: ...! This isn't the time to use that!"
- **TMs**: X and Y's TM01–TM100 in order, minus Flash and Rock Smash (HMs
  here), then Secret Power from Omega Ruby and Alpha Sapphire (TM99) and
  Bullet Seed (TM100, FireRed's TM09), Water Pulse (TM101, FireRed's TM03) and
  Shock Wave (TM102, FireRed's TM34), then every other FireRed TM whose move
  had no machine here, added at the end in the order the maps reach them: Giga
  Drain (TM103, FireRed's TM19), Iron Tail (TM104, TM23), Focus Punch (TM105,
  TM01), Skill Swap (TM106, TM48) and Snatch (TM107, TM49, in the Rocket
  Hideout). `tools/build-maps.js` stops with an error if a map gives a FireRed
  TM this game has no machine for, so a new one is added the same way.
  Compatibility comes from the Gen 6
  learnsets; for HMs and for machines Gen 6 never had (Bullet Seed, Water
  Pulse, Shock Wave and the later ones), also from
  any generation that taught the move by machine (`data/machine-learners.js`,
  built by `npm run build:machine-learners` from @pkmn/dex), which covers
  Bullet Seed, Whirlpool, Defog and Rock Climb. The same file has
  `TUTOR_LEARNERS`: who FireRed's move tutors can teach (Gen 6 had no tutor
  for Mega Punch, Mega Kick, Seismic Toss or Dream Eater), from any
  generation's tutors. TMs are reusable (as in Gen 5+), can't be held, tossed or
  sold, and HM moves can be forgotten like any other. Prices: HMs ₽3,000; TMs ₽10,000 / ₽20,000 / ₽30,000 by the move's
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
| `tools/` | Data generators (`npm run build:evolutions`, `npm run build:item-sprites`, `npm run build:maps`, `npm run build:intro`, `npm run build:battle-bgs`, `npm run build:machine-learners`, `npm run build:sprite-metrics`, `node tools/build-slot-machine.js pokefirered` for the Game Corner slot machine graphics) and their shared PNG/GBA/text helpers (`tools/lib/`) |
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
17. `engine/safari.js` → `Safari`
18. `engine/item-use.js` → `ItemUse`
19. `engine/damage-calculator.js` → `Damage`
20. `data/conditions.js` → `CONDITIONS`, `ITEM_EFFECTS`
21. `data/battle-moves.js` → `BATTLE_MOVE_EFFECTS`
22. `engine/battle.js` → `Battle`
23. `game/random-team.js` → `RandomTeam`
24. `game/opponent-ai.js` → `OpponentAI`
25. `game/party.js` → `Party`
26. `game/evolution.js` → `Evolution`
27. `game/encounters.js` → `Encounters`
28. `game/player.js` → `Player`
29. `game/bag.js` → `Bag`
30. `game/save.js` → `Save`
31. `game/world.js` → `World`
32. `game/double-battle.js` → `DoubleBattle` (the game's rules for double and tag battles)
33. `ui/screen.js` → `Screen`
34. `ui/battle-screen.js` → `BattleScreen`
35. `ui/overworld.js` → `Overworld`
36. `ui/intro.js` → `Intro`
37. `ui/game.js` → `Game` (starts the game on load)

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

### Double battles

Pass `format: "doubles"` (the default is `"singles"`, which behaves exactly as
before). Each side leads with its first two healthy Pokémon in slots a and b
(`side.actives[0]`, `side.actives[1]`; `side.active` is still slot a). A side
with only one Pokémon that can fight uses one slot (`side.actives[1]` is
`null`). Events name the slot: `p1a: Garchomp`, `p1b: Pikachu`.

```js
const battle = new Battle({ format: "doubles", seed: 1, p1: { team: [...] }, p2: { team: [...] } });
battle.start();
const req = battle.getRequest("p1");
// req.actives[slot] (null if the slot has nothing to choose):
//   { moves: [{ name, target: "normal", targets: [1, 2, -2], ... }], canMega, forced, switches, ... }
battle.choose("p1", [
  { type: "move", move: "Dragon Claw", target: 2 },   // the foe in slot b
  { type: "move", move: "Earthquake" }                // spread: no target
]);
// End of turn, after faints: req.phase "switch", req.forceSwitch [true, false]
battle.choose("p2", [{ type: "switch", index: 3 }, null]);
```

Target locations are relative, as in Showdown: `1` and `2` are the foes in
slots a and b, `-1` and `-2` your own slots a and b. Each move slot lists the
legal `targets`; a move that aims at one Pokémon and is given no target hits a
random foe. A single (non-array) choice fills the first slot still open, so a
UI can choose slot by slot.

**Tag battles** (doubles only): `p1: { name: "Red", team, partner: { name: "Leaf",
team } }` makes p1 two trainers with up to 3 Pokémon each. The trainer holds
slot a, the partner slot b; the partner's Pokémon follow the trainer's in
`side.pokemon` (`owner` 0 / 1). A slot is refilled only from its own trainer's
party; a trainer with nothing left is out (`-trainerout`) and their slot stays
empty, while the partner fights on. `getRequest("p1")` / `choose("p1", …)` cover
the trainer's slot, `"p1b"` the partner's — the game drives it with
`OpponentAI.choose(battle, "p1b")`. `switch` events carry the trainer's name,
`-withdraw` marks a Pokémon called back. Only p1's own Pokémon earn experience.

In the game, `BattleScreen.run({ format: "doubles", ... })` shows a double
battle (the header of `ui/battle-screen.js` has the options for a tag partner
and a second opposing trainer), and the game's `battle("trainer", { double:
true, partner: { name, team, pic }, foe2: { name, team, pic } })` starts one
(see **Double and tag battles** above).

The opponent AI handles doubles too: each slot aims its best single-target
attack at the foe it hurts most (never its ally), counts spread moves against
both foes, and marks down Earthquake-style moves by what they would do to the
ally.

What doubles does: spread moves at 0.75× (accuracy, crits, secondary effects
and abilities per target; recoil and Life Orb once), Earthquake / Surf /
Explosion hitting the ally, random targets for Outrage / Thrash / Petal Dance /
Struggle, retargeting when the chosen foe has fainted, turn order across all
four Pokémon, end-of-turn replacements for both sides, U-turn / Baton Pass per
slot, Helping Hand, Follow Me / Rage Powder, Lightning Rod / Storm Drain
redirection, Wide Guard (doubles only) and Quick Guard, Protect per Pokémon,
Ally Switch, Intimidate / Frisk / Anticipation / Forewarn / Bad Dreams on both
foes, Trace copying a random foe, Imposter copying the foe opposite, Pressure
per targeted foe, Shadow Tag / Arena Trap / Magnet Pull from either foe, Friend
Guard, Plus / Minus, Telepathy, Healer, Pursuit hitting a switching foe first at
double power, Beat Up hitting once per healthy party member, Leech Seed healing
whoever stands in the seeder's slot, Perish Song on everyone, Wish healing its
slot, screens at 2/3 in doubles, wild doubles (a ball only once one wild
Pokémon is left), and experience for every p1 Pokémon that was out while the
fainted foe was.

Doubles moves: Mat Block (on the user's first turn out its side is safe from
damaging moves) and Crafty Shield (from status moves aimed at it), both failing
if the user moves last; After You (the target moves right after the user; it
fails if the target would move next anyway, so always in singles); Quash (the
target moves after everyone else); Instruct (Gen 7: the target repeats its last
move at once, at the same target, with the Gen 7 failures: no last move, no PP,
recharging / charging / locking / move-calling moves, Bide, Focus Punch, Beak
Blast, Shell Trap, Transform, Sketch, Struggle, Instruct, a target in Bide or
carried by Sky Drop; it works in singles too); Spotlight (Gen 7, ahead of
Follow Me); Acupressure, Aromatic Mist and Hold Hands on the ally. Instruct and
Spotlight were added to `data/moves.js` by hand (no Pokémon learns them here).
**Sky Drop** (both formats, Gen 6): the user carries the target up (both
semi-invulnerable, as with Fly; the target can't move, switch or be forced out)
and drops it next turn; it fails on an ally, a substitute, 200 kg and up and
under Gravity, a Flying-type target takes no damage, and the target is let go
if the user faints, switches out, can't move on the second turn or is brought
down by Gravity.

Abilities on a side: Flower Veil (Grass types on its side, itself included,
keep their stats and dodge status and Yawn from others), Sweet Veil (no one on
its side falls asleep; Yawn and Rest fail), Aroma Veil (no Taunt, Torment,
Encore, Disable, Heal Block or infatuation on its side), Flower Gift (Cherrim
in the sun: 1.5× Attack and Sp. Def for it and its ally), Symbiosis (it hands
its item to the ally that has just used up its own) and Unnerve (foes can't eat
Berries, resist Berries included); these work in singles too where they apply.
Abilities act on each target of a spread move (Hyper Voice fails only on the
Soundproof foe, Petal Blizzard feeds a Sap Sipper ally), a reflectable side
move (Stealth Rock, Spikes, ...) bounces off either foe's Magic Bounce, ally
Aromatherapy feeds Sap Sipper, and Mold Breaker ignores Lightning Rod / Storm
Drain's pull. When two slots fainted and one Pokémon is left to send in, the
side picks the slot: the request's `forceSwitch` marks both, `switchCount` is
1 and `open` names the default (slot a); `[null, { type: "switch", index }]`
fills slot b.

Not implemented (or approximated) in doubles: triple / rotation battles; a
doubles Shift; Wide Guard, Pursuit-on-switch, Beat Up's party count and
Acupressure in singles (left as they were, to keep singles unchanged:
Acupressure still fails there); Gravity cancelling Fly / Bounce (only Sky Drop);
Cherrim's Sunshine Form (Flower Gift's boost works, the forme doesn't change).
The spread multiplier counts the targets when the move starts (a protected or
missed target still counts). Speed order is fixed at the start of the turn (Gen
6).
