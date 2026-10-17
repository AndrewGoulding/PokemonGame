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
how to catch Pokémon: FireRed's demo battle, the old man from behind against a
wild Lv. 5 Weedle, his ▶ moving to BAG, his bag turning to the Poké Balls and
the ball thrown, all on its own timing, as FireRed's (it has no Teachy TV to
give after). The Pokémon Center's nurse heals your party (and is where
you return if you black out), and its PC is FireRed's: "Which PC should be
accessed?" (Someone's PC, which becomes Bill's PC once you've helped him; your
own; Prof. Oak's PC once you have a Pokédex (his rating, FireRed's: Kanto's
seen and owned, his word on it to its fanfare, then the National Pokédex's
and whether it's complete; the aides around Kanto count Kanto's kinds, as
FireRed's do); the Hall of Fame once you're
Champion: each team on record, newest first, as FireRed's PC shows it). Bill's PC is the Pokémon Storage
System: 30 boxes of 30 (BOX1-BOX30, each with a name and one of FireRed's 16
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
SUMMARY to look at a Pokémon as it is in the battle; in battle the Pokémon
fighting is first, and the one sent in takes the place of the one it
replaced, FireRed's battle order).
Then the Bag, FireRed's Bag screen with nine pockets (Items, Medicine,
Power-up, Poké Balls, TMs & HMs, Berries, Held Items, Mega Stones, Key Items;
left / right between them, and each pocket remembers where its ▶ was). Power-up
holds what makes a Pokémon stronger for good (vitamins, Wings, PP Up and PP
Max, mints, Rare Candy, Exp. Candies, Ability Capsule and Patch, Bottle Caps), Held Items
what is mainly for holding (Leftovers, Choice items, type boosters, weather
rocks, Light Clay, Iron Ball...), Mega Stones the stones; every pocket shows
FireRed's bag, its pockets opening left, middle, right in turn. In battle the Bag
shows only the pockets with something usable there (Items, Medicine, Poké
Balls, Berries). Old saves simply sort into the new pockets, with FireRed's descriptions under the list
(its own words and line breaks, for the items FireRed has). A opens Use / Give / Toss; Toss asks how
many and throws them away right there. The Ability Capsule switches a
Pokémon between its species' two ordinary Abilities (it asks first; not a
Hidden Ability, nor a species with one). The Ability Patch (as in Scarlet and
Violet; dig it up with the Explorer Kit) switches an ordinary Ability to the
species' Hidden Ability, or the Hidden Ability back to its first ordinary one
(it asks first too); a Hidden Ability stays hidden when the Pokémon evolves. Bottle Caps are Hyper Training, as in
Sword and Shield and Scarlet and Violet: on a Pokémon of Lv. 50 or more, a
Bottle Cap makes one stat you pick (from the ones not already at 31) act as
if its IV were 31, a Gold Bottle Cap all of them; the IV itself stays as it
was, for breeding, and the Summary's IV page shows 31. It holds medicine, evolution
stones (each item for evolving says "Evolves certain Pokémon when used."), Rare Candy, vitamins, PP Ups, mints, TMs/HMs, held items, and Key Items:
the Exp. Share, Oak's Parcel, the Town Map and the Fishing Rod (see
**Fishing** below). After the Bag come FireRed's Pokédex, the **National
Pokédex** from the moment Oak hands it over (Pokémon from beyond Kanto turn
up in the campaign; FireRed's IsNationalPokedexEnabled is `Player.nationalDex`:
its table of contents is FireRed's National one, with Seen and Owned each
for Kanto and National; Numerical mode: Kanto and Numerical mode: National,
the ▶ starting on National, by National Pokédex number, each up to the last
one you've seen, with the caught ball and
types; the nine habitats' pages, up to four Pokémon a page in their circles;
Search: A to Z mode (the ones seen), Type, Lightest and Smallest mode (the
ones caught);
this game's Area mode: Kanto, under the Pokémon list: every place with wild Pokémon (but the S.S. Anne, whose dock has Vermilion City's; FireRed's and LeafGreen's alike; ----- until you've been
there) with how many of its Pokémon you've caught and a gold crown once you've
caught them all, and A on one lists them FireRed-style under the titles Grass
(and caves), Fishing and Surfing; each entry's category,
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

**Fishing** is FireRed's (`StartFishing` in src/field_player_avatar.c), with
one Fishing Rod (the Super Rod's picture) in place of its three: use it from
the Bag, or register it to Select, facing
water (on foot, water you could Surf onto; surfing, open water). You cast
(FireRed's fishing sprites), and a second later dots appear one by one in
the text box, 4 to 10 of them. Then either "Not even a nibble‥" or a bite:
the rod bends, a "!" pops up over your head, and "A POKéMON's on the hook!".
As in FireRed there's no button to press in time and only one round of dots
(its Fishing7 goes straight to the hook). FireRed bites one cast in two;
here bites are twice as likely, so every cast bites wherever there's
something to fish. Then a wild battle with one of the map's fishing
Pokémon: FireRed's `fishing_mons`, still the Old Rod's two slots (70/30),
the Good Rod's three (60/20/20) and the Super Rod's five (40/40/15/4/1),
each version's Pokémon where FireRed and LeafGreen differ (Johto's maps,
HeartGold and SoulSilver's three rods). Which rod's slots a bite comes from
goes by your **fishing level** (`game/fishing.js`): every Pokémon hooked
earns fishing XP (10 for an Old Rod Pokémon, 15 for a Good Rod one, 20 for a
Super Rod one), and levels go as mining's do (20 XP a level up to 20, then
40, 60, 80 and 100; level 100 at 5,980 XP). Up to level 9 only the Old Rod's
Pokémon bite; from 10 the Good Rod's too (60/40); from 25 the Super Rod's
(30/40/30); from 50, 15/35/50, and from 75, 5/25/70. From level 50 the Super
Rod's rarer slots come up more often too (35/35/20/7/3, and 30/30/25/10/5
from 75). The XP and any new level are told after "on the hook!", and the
trainer card shows your fishing level. In the Safari Zone it's a Safari
battle. The Fishing Guru in Vermilion City gives you the Fishing Rod; his
brothers in Fuchsia City and on Route 12 give it to you if you haven't got
it yet, and otherwise tell you your fishing level and what's next (the Route
12 brother then keeps FireRed's Magikarp size record). Old saves have their
rods turned into the one Fishing Rod.

**The Berry Crush** is FireRed's (src/berry_crush.c; `game/berry-crush.js`
plays it, `ui/berry-crush.js` draws it with the pictures from
`tools/build-berry-crush.js`): the Direct Corner attendant upstairs in every
Pokémon Center offers it once you have the Powder Jar. FireRed plays it over
the Wireless Adapter with 2 to 5 people; here you choose how many and the
others are the computer, each pressing at a steady rhythm of their own. You
pick a Berry from the Bag (it's used up), everyone's Berry drops into the
crusher, the lid falls, "3 2 1 START", and pressing A pushes the lid down:
presses on the same frame as someone else's count extra (FireRed's
sSyncPressBonus) and land as big impacts, the screen shakes and powder spills
out of the tube. When the lid's all the way down (the Berries' difficulties
added up), the results: the number of presses, one of neatness, cooperation or
pressing power at random, then the Berries, time, pressing speed (a record for
that many players goes red) and silkiness. The powder made (the Berries' powder,
times the players, times the silkiness) goes into your Powder Jar, then "Want
to play Berry Crush again?".

**Breeding and Eggs**: two Pokémon left at Four Island's Day-Care may find
an Egg, as in FireRed (src/daycare.c): every 256th step, 70% of the time if
they're the same species from different Trainers, 50% the same species from
you or different species from different Trainers, 20% different species
from you (or Ditto with one of yours), never if they share no Egg Group
(`data/breeding.js`, built from @pkmn/dex by `tools/build-breeding.js`), are
the same gender, or are Ditto twice or Undiscovered. The Day-Care Man
outside says how well they get on, and has the Egg for you ("You do want it,
yes?"); the lady says he was looking for you. What's in it follows Gen 6's
rules, as the battles do: the mother's first stage (or the one that isn't
Ditto's), an incense baby only when a parent holds its incense (Sea Incense
for Azurill...), Nidoran♀'s and Illumise's either of the pair, Manaphy's a
Phione; three IVs from the parents, five with a Destiny Knot, a Power item's
stat first; an Everstone's nature; the mother's Hidden Ability 60% of the
time, otherwise her Ability slot 80%; the mother's Poké Ball; Lv. 1 with its
level-up moves, then the Egg moves either parent knows, and the level-up
moves both know (and Volt Tackle with a Light Ball). Eggs ride in the party
(FireRed's EGG box, icon and Summary page with its Egg Watch), can't battle,
hold items, learn moves or be traded, and every 255 steps are a cycle nearer
hatching (two with a Flame Body or Magma Armor Pokémon in the party): then
"Huh?" and FireRed's hatching scene (`ui/egg-hatch.js`): the Egg wobbles and
cracks three times, bursts in a white flash, the Pokémon's cry, "… hatched
from the EGG!" to its fanfare, and a nickname if you like.

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
and TM19 Giga Drain, TM103 here), and the Game Corner: buy Coins (100 for ₽2,000,
500 for ₽10,000 or 1,000 for ₽20,000: FireRed's ₽20 a Coin, though its list is 50 and 500, with your money and Coins in their boxes at
the top left; up to 9,999 in the Coin Case), get a few from the gamblers,
find them on the floor, and play FireRed's slot machines (its reels, odds,
lines and payouts, from `src/slot_machine.c`), or go through the doorway in
the back wall (left of the stairs) to the card room (this game's own, built
from the Game Corner's tiles by `tools/build-card-room.js` into
`data/card-room.js`), where the dealers stand at the poker and blackjack
tables and the regulars sit in the chairs around them (people in all sorts
of clothes, the same all day: three at poker, two at blackjack), and three
players sit at the mahjong table with a chair free. Play
Texas Hold'em at the poker
table (this game's own: `game/poker.js` has the rules, `ui/poker.js` the
table). The dealer seats you, once you have the Coin Case, at the stakes you
pick: low stakes (a 200-Coin buy-in, blinds of 1 and 2), mid stakes (1,000;
5 and 10) or high stakes (3,000; 15 and 30), your buy-in in chips, against
three trainers from around the game (`game/table-players.js`: any trainer
but Gym Leaders, the Elite Four, rivals, Team Rocket and pairs, by class and
name, "Bird Keeper Wilton", each with their class's front picture as a
portrait), who buy in the same; one who runs out of chips leaves and another
trainer sits down. Now and then (3% a seat, at any of the card tables) a
star sits in instead: a Gym Leader, one of the Elite Four, Red, Leaf or your
rival, each with their own picture and way of playing, and the dealer points
them out; one among the regulars in the card room's chairs wears their own
overworld sprite. It's fixed limit: bets and raises of the big blind before
the flop and on it, and twice that on the turn and river, four bets a round
at most (the table shows its stakes); short stacks go all
in, with side pots. At all three tables what's happening and your choices
are in FireRed's windows in the panel under the screen (`ui/table-ui.js`):
the message in the standard frame, the choices in the frame you picked in
the Options with FireRed's ▶, in FireRed's font; the screen above is all
table, the cards, tiles and portraits as big as it allows. On your turn pick Fold, Check or Call, or Bet or Raise
(the D-pad and A, or tap). Your hand so far is named in the middle of the
table ("Your hand: Pair of Kings"; from the flop on, your best five-card hand,
its five cards outlined in gold among yours and the board's). The
regulars each guess their chance of winning by dealing the rest of the hand
out a few hundred times and weigh it against the price of a call, in their
own style: tight for careful sorts (Gentlemen, Ladies, Scientists,
Engineers, Super Nerds, Aroma Ladies), loose and given to bluffing for the
gambling sorts (Gamers, Bikers, Rockers, Cue Balls, Burglars, Jugglers,
Sailors), and either or in between for everyone else. At a showdown everyone's cards turn over and the best
five of seven win, pot by pot. Between hands, Next hand or Leave
(B); your chips go back in the Coin Case as Coins. Or play blackjack (this
game's own: `game/blackjack.js`, `ui/blackjack.js`) with the dealer beside
the poker table (talk to the dealer or the table), with two other trainers at the table (picked the same way,
portraits and all; you sit between them) betting and playing their own hands
by basic strategy against the same dealer and shoe, one after another (one
who runs out of Coins leaves, and another sits down): bets of 10, 20, 50, 100 or 200 Coins straight from your Coin
Case (it keeps up with every hand, and the game saves after each), a six-deck
shoe shuffled again once three quarters of it is dealt, the dealer standing
on all 17s and checking for Blackjack with an Ace or ten-card up, Blackjack
paying 3 to 2, Double Down on your first two cards and one Split of a pair
(split Aces take one card each). Hit, Stand, Double Down and Split are
picked with left / right and A, or tapped; the dealer's hole card turns over
and its draws come one at a time. Or sit in at the mahjong table (this
game's own: `game/mahjong.js`, `ui/mahjong.js`; tile pictures from
FluffyStuff's riichi-mahjong-tiles, public domain, by
`tools/build-mahjong-tiles.js`): talk to any of the three players there
("Want to play with us? It costs 250 Coins for the buy-in.") and take the
free chair for 250 Coins, which is 25,000 points. You play those three, and
three new ones sit down after every game (anyone, picked as for poker, a
star 3% of the time a chair). The suits go by their English names (Characters, Dots and
Bamboo: "6 of Dots"), each suited tile with its number in a corner badge in
its suit's colour, and once you're in Riichi the middle of the table shows
the tiles you're waiting on and how many of each could still be out there
(four, less the ones you can see). Choosing Riichi lists every tile you
could drop for it and what you'd be waiting on after each; in Riichi, each
tile you draw is discarded for you, unless it wins (then Tsumo, or let it go). It's Riichi: an East round,
136 tiles (no red fives, no kans), Pon, Chi, Ron, Tsumo and Riichi, furiten,
dora and ura-dora, honba and the usual yaku, han, fu and limits (mangan to
yakuman), against three trainers (picked as for poker, portraits and all)
who play for the fastest hand, call when it helps and, far from ready, play safe against a Riichi.
Between hands, Next hand or Leave; every 100 points you have when
you get up (or when the game ends) is a Coin. SELECT gets you up at any
time (after a YES / NO, the table waiting), forfeiting your buy-in. Spend Coins in the Prize Room on
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
Hitmonlee or Hitmonchan, Lv. 25, and the other stays on its shelf; once
you're Champion its Black Belts and the Karate Master battle you once more,
with their Pokémon fully evolved at Lv. 48-52 (Machamp, Primeape, Hitmonlee
and Hitmonchan), and the Karate Master, beaten again, gives you the Hitmon
you left behind, Lv. 50), and
Sabrina's Gym, a maze of warp pads you spin away on (her Alakazam holds its
Alakazite and Mega Evolves; the Marsh Badge and TM04 Calm Mind). Silph Co., 1F to 11F: its Rockets and scientists, its items, the
warp pads between floors and rooms, the elevator, and locked doors that the Card
Key from 5F opens for good; the Thunder Wave tutor on 2F (₽1,000 a time, as often as you like), a nap on 9F, Gary on 7F
(Pidgeot, Growlithe, a Gyarados holding its Gyaradosite, which Mega
Evolves, Exeggutor, Umbreon and Alakazam; Lv. 35-40) and the Silph worker there who gives
you a Lapras, Lv. 25; and Giovanni in the boardroom on 11F, where Red comes down
by the warp pad and, without a word, stands beside you for a tag battle (his
Charizard, holding Charizardite X, Snorlax and Pikachu, Lv. 36; Giovanni has
FireRed's team, his Kangaskhan holding its Kangaskhanite, and both Mega
Evolve): beat him and Team Rocket leaves Silph and Saffron, Red heads back the
way he came, the townsfolk come back out, and the President gives you the
Master Ball. The Silph Co. 5F TM01 (Focus Punch) is TM105 here.
South of Lavender Town, Route 12 (its gate, with TM27 Return from the girl
upstairs; the fishermen along the pier; the Fishing Guru's younger brother's
house, with his Magikarp size record, FireRed's, for a Net Ball)
is blocked by a sleeping Snorlax: play the Poké Flute to wake it, and it attacks,
a wild Snorlax, Lv. 30, you can catch; beaten or not, it's gone. Routes 13, 14 and
15 (their trainers, Cut trees and hidden items; Route 15's gate, where Prof.
Oak's Aide has the Exp. Share for fifty kinds caught and the binoculars show
Articuno) lead west to Fuchsia City: its Pokémon Center, the Poké Mart, the
Substitute tutor, the Pokémon statues' signs, the Fishing Guru's older brother
(on your fishing level), Bill's grandfather's house, the Move Deleter, the Safari Zone
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
walking back into the gate early, you're asked if you're leaving. Leaving,
you walk one step further from the counter than in FireRed, past the
attendant's trigger, so you can't walk straight back in without paying. FireRed's
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
him beats his Gym's trainers. Then Bill is waiting outside: he'd like you to
come with him to One Island (say no and he waits in the Pokémon Center, ready
when you are). His friend's Seagallop pulls in and you board it together, and
FireRed's ferry ride plays (`ui/seagallop.js`: the sea rushing past between
black bars, the ferry crossing the screen east or west with its wake, SE_SHIP,
the fade out; its pictures from `tools/build-seagallop.js`). **The Sevii
Islands, part 1** (`game/sevii.js` has the ports, menus and story flags): on
One Island Bill takes you to the Pokémon Net Center to meet Celio, whose PCs
can't link with Kanto's; Bill stays to help (meanwhile the PCs can't reach
Pokémon storage) and gives you a Meteorite for the Game Corner's owner on Two
Island; Celio gives you the Tri-Pass and the Town Map's Sevii page. The
islands' harbors each have a Seagallop sailor with FireRed's menus: the other
islands of One, Two and Three with the Tri-Pass (and Vermilion once you've
been home), and Vermilion's dock sails to them too once the S.S. Anne's gone.
One Island: its houses, Kindle Road (its swimmers, fishermen, Crush Girls,
Black Belts, a camper and picnicker, Crush Kin Mik & Kia (a double battle),
Rock Smash rocks, items and wild Pokémon on land and water) and the Ember Spa,
whose hot spring heals your Pokémon and whose old man gives you HM08 Rock Smash
(FireRed's HM06); Treasure Beach and its hidden items; Mt. Ember (its Pokémon
Rangers and Crush Girl, the Explosion tutor, Strength boulders and Rock Smash
rocks, the summit paths up to Moltres, a wild Lv. 50 Moltres as Articuno and
Zapdos are). Two Island: the shop (more for sale as the story goes on), the
Move Maniac (a move a Pokémon has forgotten, for two Tinymushrooms or a Big
Mushroom), and the Joyful Game Corner, where Lostelle's dad asks you to find
his daughter while a lost biker barges in looking for Three Island; Cape Brink
and its old woman, who teaches a fully evolved starter in the lead, if it's as
fond of you as can be, its ultimate move (Venusaur Frenzy Plant, Charizard
Blast Burn, Blastoise Hydro Cannon; each once). Three Island: bikers face down
two islanders in the road north; once the biker's been to Two Island their boss
Paxton turns up, and walking past them you take on three Biker Goons and then
Cue Ball Paxton, and the gang leaves; Bond Bridge (its swimmers, tubers, Aroma
Ladies and the twins Joy & Meg) to Berry Forest, where Lostelle's in trouble: a
wild Lv. 30 Hypno, then her Iapapa Berry, and she takes you home to her dad,
who swaps the Meteorite for a Moon Stone. Three Isle Port (its bikers, the
Dunsparce Tunnel, dug out with a Nugget for you, as FireRed has it with the
National Pokédex) and the
islands' marts and Pokémon Centers (respawn points and Fly spots). Back at One
Island Bill's done, and the Seagallop takes you both home to Cinnabar, where he
says goodbye. Until you're Champion only One, Two and Three Island can be
reached. Once you are (FireRed's condition is the National Pokédex, which it
gives after the Hall of Fame; here you have that from the start), Celio asks you to find a gem for his Network
Machine, and two Team Rocket grunts outside Mt. Ember let slip the Rocket
Warehouse's passwords ("Goldeen need log", "Yes, nah, Chansey"); beat them and
the Ruby Path opens (its floors down to B5F, FireRed's Braille on its walls),
the Ruby at the bottom. Celio puts it in the machine, trades your Tri-Pass for
the Rainbow Pass (the ferries' two-page menu, Four to Seven Island on it) and
asks you to find the Sapphire too. The Town Map turns to the Sevii Islands'
map (SWITCH, or R) once you have its page, opening on wherever you are, and Fly
goes there. **The Sevii Islands, part 2**: with the Rainbow Pass the Seagallop
sails on to Four and Five Island. Four Island: Gary's waiting off the boat the
first time, already done with the island and off with his Pokémon Egg; the
Pokémon Center (a respawn point and Fly spot), the Poké Mart, the Body Slam
tutor's house, the sticker man (brag about your Hall of Fame entries and he
puts a sticker on your Trainer Card, a better one each tier), and the Day-Care,
FireRed's two-Pokémon one: the Day-Care Lady takes up to two Pokémon, each
growing a point of Exp. a step, and her husband outside says how they're
doing and how well the two get on; when they find an Egg, he has it for you
(see **Breeding and Eggs** below). Lorelei's house,
her stuffed dolls (six always there, and one more for every 25 times you've
entered the Hall of Fame, up to 200: FireRed's UpdateLoreleiDollCollection). Icefall Cave (Surf to it, Waterfall inside: HM07 Waterfall is on 1F):
on 1F the thin ice cracks the first time you step on it and breaks the next,
dropping you to B1F (FireRed's sIcefallCaveIceCoords; whole again when you
come back), and on B1F the ice is slippery: step onto it and you slide on the
way you were going until something stops you (FireRed's MB_ICE). Up the
waterfall at the back, Lorelei, home from the League, is facing down Team
Rocket poaching the cave's Pokémon; she asks you to take one of them on, then
her Lapras gets the truth out of him (the Pokémon are in the Rocket Warehouse
on Five Island) and they run; she's at home on Four Island after that.
Five Island: its houses and Pokémon Center; Five Isle Meadow, Team Rocket's
grunts, Cut trees and the Rocket Warehouse's door, which takes two passwords:
"Goldeen need log" and "Yes, nah, Chansey" (the second from the Dotted Hole on
Six Island). Inside, FireRed's spinning-arrow floor, its grunts
and two Admins: the one by the arrows turns them round when she's beaten so
you can come back through, and beating the one by the computer (he turns to
face you as you come up) sends Team Rocket packing for good (the pens are
open, the Pokémon gone; Lorelei's glad to hear it). Scientist Gideon,
who stole the Sapphire, hands it over once beaten, for Celio. The Memorial
Pillar: leave a Lemonade on Tectonix's grave and its owner gives you TM42
Facade; its Bird Keepers, items and hidden berries. The Water Labyrinth: a
gentleman gives his Egg to a Trainer whose lead Pokémon is as fond of them as
can be: a Togepi Egg. Resort Gorgeous (its
Painters, Ladies, Youngster and swimmer) and the Lost Cave, a maze of
fog-filled rooms with its Ruin Maniac and Psychic: Lady Selphy is lost in it,
battles you and asks you to take her home; at home she'd like to see a
Pokémon you've seen (FireRed's SampleResortGorgeousMon; she tires of waiting
after 250 steps), and when you show her one, her butler thanks you with a
Luxury Ball or, sometimes, something finer. Trainers, items, hidden items,
wild Pokémon, signs and the Town Map's Four and Five Island page. **The Sevii
Islands, part 3**: the Seagallop sails to Six and Seven Island too. Six
Island: Gary's in its Pokémon Center the first time you come (he can't find
all the Pokémon around here, and goes home; he's not on Four Island after
that), its Poké Mart and house; the Water Path (its trainers, among them the
twins Miu & Mia, a double battle, items and hidden berries) and its houses,
one of them the Heracross fan's, who measures a Heracross (FireRed's size
record, as the Magikarp's) and gives you a Nest Ball for the biggest yet;
Ruin Valley (Ruin Maniacs and Hikers, Strength boulders, items), where a
scientist stands puzzling at the Dotted Hole's door until you've been to
Icefall Cave: its six dots spell "CUT" in Braille, and Cut used on it from
below opens it (FireRed's CutMoveRuinValleyCheck). The Dotted Hole: on each
floor a Braille sign says which hole takes you down (UP, LEFT, RIGHT, DOWN);
any other drops you back to the top. At the bottom you find the Sapphire, and
the man who's been following you drops in, snatches it to sell to Team Rocket
and lets slip the Warehouse's second password as he runs (he's Scientist
Gideon, in the Rocket Warehouse); the Sapphire room's Braille poem. Green Path,
Pattern Bush (its Pokémon Breeders, Bug Catchers and the rest; Heracross in
its grass; an Escape Rope takes you out by the way you came in), Outcast Island
(its Team Rocket grunt, gone with the Warehouse's Rockets, swimmers and Sis
and Bro Ava & Geb) and Altering Cave (FireRed's Zubat: the others came with
Mystery Gift events). Seven Island: its Pokémon Center, Poké Mart, the Swords
Dance tutor, and the house whose old woman would like to watch battles (her
visiting trainers came on FireRed's e-Reader cards, so none come here).
**Trainer Tower** (`game/trainer-tower.js`, its challenges from FireRed's
built-in sets, `tools/build-trainer-tower.js`): at the lobby's counter
choose Single, Double, Knockout or Mixed and the clock starts; up the stairs
each of the eight floors has its battle, laid out for it (FireRed's floor
layouts for each kind): a trainer who walks up to you with two of their six
Pokémon, a pair waiting for a double battle (not without two Pokémon that can
fight), or three trainers one after another, each with one; their Pokémon are
at your best Pokémon's level, what they say is FireRed's Easy Chat, and there's
no Exp. or money and no healing on the way but the lobby's nurse. Lose and
you're back at the counter. The tower's owner on the roof stops the clock,
gives the challenge's prize (once: Up-Grade, Dragon Scale, Metal Coat, King's
Rock) and says whether you've set a record; the best times are on the lobby's
Time Board, and the elevator takes you back down. Canyon Entrance and Sevault
Canyon (Cooltrainers, Young Couple Eve & Jon and Cool Couple Lex & Nya, Rock
Smash rocks, the Chansey dance man's house, where dancing along heals your
Pokémon), the Tanoby Key (push a boulder over each of its seven switches and
far away the Tanoby Ruins rumble) and the Tanoby Ruins: their seven chambers
stay dark and empty until then, and after have Unown, each chamber its
letters (FireRed's sUnownLetterSlots; the letters' pictures from FireRed's,
`tools/build-unown.js`). Trainers, items, hidden items, wild Pokémon on land,
on the water and under rocks, signs and the Town Map's Six and Seven Island
page. Gideon's Sapphire goes to Celio, whose machine then links with Hoenn
(FLAG_SYS_CAN_LINK_WITH_RS): the League's rematch teams, Lorelei back at the
League, and (FireRed's FLAG_HIDE_CERULEAN_CAVE_GUARD, `Sevii.ceruleanCaveOpen`)
Cerulean Cave's guard steps aside, Champion or not, as in FireRed. And (this
game's) Celio gives you Bill's reward for all your help: Emerald's
**Old Sea Map** (see **Faraway Island** below). From Cinnabar,
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
Pidgeot (47), Growlithe (45), Gyarados (45), which Mega Evolves with its
Gyaradosite, Exeggutor (45), Umbreon (53, his ace) and Alakazam (47); losing blacks you
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
nurse); the guard at the Elite Four's door wishes you luck (once you're
Champion, FireRed's door check: she stands in the doorway, "Lorelei of the
Elite Four is absent", until the Sapphire is in Celio's machine; FireRed asks
for the National Pokédex, which its players only get after the Hall of Fame,
so here, with the National Pokédex from the start, it waits for you to be
Champion rather than shut the League before your first challenge), and through it
is the **Pokémon League** (FireRed's rooms and scripts, `game/pokemon-league.js`):
walk into Lorelei's room and you're walked up to her as the way in shuts
behind you; there's no way out but on, through the door at the back that opens
(FireRed's sound and tiles) once she's beaten, then Bruno's room, Agatha's and
Lance's (through his long corridor), each with FireRed's team, words, room
music and battle background, to the Gym Leader battle music. Black out to any of
them and you're back at the Indigo Plateau's Pokémon Center, and the run starts
over from Lorelei (FireRed's EventScript_ResetEliteFour). Then Gary, the
Champion, to the Champion's music: his team as on Silph Co. and Route 22, at
FireRed's Champion levels: Pidgeot (59), Arcanine (59: his Growlithe's evolved),
Gyarados (59), which Mega Evolves with its Gyaradosite, Exeggutor (61),
Umbreon (63, his ace, with a Sitrus Berry) and Alakazam (57). Beaten, Prof. Oak comes
in, congratulates you, tells Gary why he lost and takes you up to the Hall of
Fame; his words there, the record machine, and FireRed's Hall of Fame screen:
your team saved on record ("SAVING… DON'T TURN OFF THE POWER."), each Pokémon
in turn with its cry, number, name, level and ID No., "Welcome to the HALL OF
FAME!" with applause and confetti, then you, your name, ID No. and time, and
"LEAGUE CHAMPION! CONGRATULATIONS!". Then the credits: out in front of the
Indigo Plateau Gary runs off, Prof. Oak looks at you and walks off, you run
off too, and FireRed's credits roll over Kanto's towns and routes (FireRed's
staff, timings and scenes, with Charizard, Venusaur, Blastoise and Pikachu, to
THE END; after the first time, Start or B skips them). You wake up at home in
Pallet Town, Champion (FireRed's FLAG_SYS_GAME_CLEAR; blacking out takes you
home again until you use another Pokémon Center), and Red's Mom has heard the
news. The League can be challenged again (Gary's and the others' rematch words
once you're Champion; FireRed's rematch teams, Lorelei's to Lance's from its
data and Gary's at its levels, once the Sevii Islands' story sets
FLAG_SYS_CAN_LINK_WITH_RS, with the Sapphire). **Cerulean Cave**, once its
guard has stepped aside: 1F, 2F and B1F, their ladders, water to Surf and Rock
Smash rocks, FireRed's wild Pokémon (Ditto, Wobbuffet, Kadabra, Electrode and
the rest; Psyduck and Golduck on the water, Geodude and Graveler under the
rocks), its items (a Nugget, Full Restores, a Max Elixir, PP Up, Ultra Balls,
a Max Revive, one hidden), and deep in B1F Mewtwo: "Mew!", its cry, and a wild
Lv. 70 Mewtwo to its own battle music; caught or beaten it's gone, run from
it flies away and is back the next time you come (FireRed's
CeruleanCave_B1F_EventScript_Mewtwo). Its icon shows on the Town Map from then
on. With that, **Kanto and the Sevii Islands are complete**. Left out
on purpose: the link rooms (the Pokémon Centers' Battle Colosseum, Trade
Center, Record Corner and Union Room), FireRed's unused and prototype maps,
e-Reader content
(Seven Island's visiting trainers), and FireRed's Mystery Gift islands, Navel
Rock and Birth Island (Ho-Oh, Lugia and Deoxys: Johto and Hoenn are to come
instead; no tickets, no ferry there, and they stay sea on the Town Map). Tiles, palettes and metatiles come from
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

`tools/build-town-map.js` renders FireRed's Kanto region map and its three
Sevii Islands maps (1-2-3, 4-5, 6-7) into `assets/town-map/` and writes
`data/town-map.js` (the grids of places, their names, which place each map is
in, and where Fly lands):

```sh
cd pokefirered && git sparse-checkout add graphics/region_map/ src/data/region_map/ && cd ..
node tools/build-town-map.js pokefirered     # after build-maps.js
```

### Seagallop ferry

`tools/build-seagallop.js` converts the ferry ride's sea, ferry and wake
(`graphics/seagallop/`) into `assets/seagallop/`:

```sh
cd pokefirered && git sparse-checkout add graphics/seagallop/ && cd ..
node tools/build-seagallop.js pokefirered
```

### Trainer Tower and Unown

`tools/build-trainer-tower.js` converts Trainer Tower's built-in challenges
(`src/trainer_tower_sets.c`: each floor's trainers, their Easy Chat words and
Pokémon, the prizes) into `data/trainer-tower.js`; `tools/build-unown.js`
converts Unown's letters B to Z, ! and ? (`graphics/pokemon/unown/`) into form
sprites (`assets/sprites/pokemon/[back/][shiny/]201-<letter>.png` and the party
icons), then `tools/build-sprite-metrics.js` places them:

```sh
cd pokefirered && git sparse-checkout add src/ include/ graphics/pokemon/unown/ && cd ..
node tools/build-trainer-tower.js pokefirered     # after build-maps.js (the trainers' pictures)
node tools/build-unown.js pokefirered && node tools/build-sprite-metrics.js pokefirered
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

Every Pokémon's level-up moves are then Scarlet and Violet's (with The Teal
Mask and The Indigo Disk), or, for one that isn't in them, the latest game's
it's in (Brilliant Diamond and Shining Pearl, Sword and Shield, Ultra Sun
and Ultra Moon or Let's Go; not Legends: Arceus, whose level-up sets are
short ones): `tools/build-levelup-learnsets.js`
writes them from PokeAPI's CSVs into `data/learnsets-levelup.js`, which
replaces each species' level-up list (and says which game each came from,
`LEVELUP_SOURCE`); TMs, tutors and Egg moves are as before. A move learned on
evolving (level 0 there, as Charizard's Air Slash) is learned when it evolves.
Thousand Arrows and Thousand Waves aren't in the game, so Zygarde goes without. One
addition of this game's own: Charmander, Charmeleon and Charizard still
learn Metal Claw at 13, as in FireRed, for Brock's Rock types. Every
trainer's Pokémon (Gym Leaders, the Elite Four, rivals, Trainer Tower and
everyone on the maps) knows the last four moves it learns by its level.

```sh
mkdir pokeapi && for f in pokemon_moves version_groups move_names; do
  curl -sSfL -o pokeapi/$f.csv https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/$f.csv; done
node tools/build-levelup-learnsets.js pokeapi
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

`tools/build-credits.js` converts the Hall of Fame's confetti and the credits'
pictures (`graphics/credits/`: the Poké Balls and Pokémon, Gary running, THE
END) into `assets/credits/`:

```sh
cd pokefirered && git sparse-checkout add graphics/credits/ graphics/misc/ && cd ..
node tools/build-credits.js pokefirered
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
with Levitate float 8 pixels). In a single battle a tall Pokémon of yours
(Mega Blastoise's cannon, Charizard's wings) would reach up behind the foe's
healthbox, so it stands lower instead, its feet behind the text box as in
Diamond and Pearl (the metrics also measure the empty rows above each back
sprite for this). `ui/game.js` picks
the terrain like FireRed: tall grass for grass encounters, the building scene
indoors, a cave underground, and the plain scene elsewhere.

To add maps, list them in `MAPS` at the top of `tools/build-maps.js` and rerun
it; doors and map edges connect themselves when both sides are built.
Walking off an edge toward a map that isn't built yet says so.

People wider than a tile (Snorlax, bikers, the Seagallop) are centred on
their tile, as FireRed draws them, and Snorlax, the old man lying across
Viridian's road and the legendary birds block the tiles either side of them
too. Rules follow Gen 3: collision and elevation per block, solid doors you walk
into, door mats you walk out through, stairs (as FireRed's: step onto the
bottom step, then press toward the stairs to take them; you arrive on the
other floor's stairs facing away from them), ledges you can jump down,
connected maps you walk straight into, and tall grass encounters at the map's
rate (Random() % 2880 < rate × 16) using the 20/20/10/10/10/10/5/5/4/4/1/1
encounter slots. Wild Pokémon come from both versions: where LeafGreen's table
has a different Pokémon in a slot (Sandshrew for FireRed's Ekans on Route 4),
either is as likely. The three starters are out in the wild, 5% each: Bulbasaur in Viridian Forest, Charmander on Route 3 and Squirtle on Route 24. FireRed's TMs found in item balls become this game's
machine for the same move (TM09 Bullet Seed is TM100 here). An Escape Rope works
where FireRed allows it (caves, Viridian Forest) and takes you back to where
you last went from outdoors through a door or cave entrance, one step out from it as in FireRed (UpdateEscapeWarp). The Berry Powder man in Cerulean gives you the Powder Jar once you've a Berry and sends you to the Direct Corner's Berry Crush (or crushes your Berries himself, at the Berry Crush's amounts), and swaps the powder for his FireRed prizes; the sign in his house shows your Berry Crush records. Trainers work as in FireRed: one you haven't beaten sees you
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
Mr. Mime "Mimien" (every in-game trade plays FireRed's trade sequence,
`ui/trade-scene.js`, pictures by `tools/build-trade.js`: yours leaves in its
Poké Ball, down into the GBA and up the cable, passes theirs on the way, and
theirs bounces in and comes out), Prof. Oak's Aide giving HM05 Flash for ten kinds
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
Guru's Fishing Rod, Elyssa's trade (Ch'Ding the
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
in every Pokémon Center (he trades you a Lv. 5 Rattata for your Pokémon and
then trades it straight back, both shown with FireRed's trade sequence, so
trade evolutions happen), and Bill: a
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
battle: in the move menu, START switches Mega Evolution on for the move you
pick, shown as pokeemerald-expansion shows it: its Mega trigger slides out
from behind your healthbox while you choose a move and lights up while it's
on. A Mega Evolved Pokémon's healthbox (either side, singles or doubles) shows
the expansion's Mega symbol in place of "Lv" (tools/build-mega-icons.js).
Mega Evolving plays the expansion's BattleScript_MegaEvolution: "…'s
Charizardite X is reacting to …'s Mega Ring!", then its Mega Evolution
animation frame for frame (gBattleAnimGeneral_MegaEvolution, pictures by
tools/build-mega-anim.js): yellow flashes while specks fly in, the Mega Stone
grows over it as the screen turns white, it cries and changes in the white,
then shakes as the Mega symbol pulses on it and purple puffs swirl up; then
"… has Mega Evolved into Mega Charizard X!" (BATTLE SCENE off leaves out the
animation). Its
Summary in battle (from the party screen) shows its Mega form: the Mega
picture, the stats the battle worked out, its Mega ability and types; after
the battle it's back to its own form. (FireRed has no Mega Evolution; trainers
holding a Mega Stone already could.)

Other Mega Stones around Kanto (this game's own): the Beedrillite in Viridian
Forest, the Aerodactylite in Mt. Moon (B2F), the Gyaradosite on Route 25, the
Slowbronite in the Seafoam Islands (1F), the Pinsirite and the Scizorite in
the Safari Zone (Center and East areas), and the Mewtwonite X and Y beside Mewtwo's spot in Cerulean
Cave once Mewtwo is caught or beaten (not if you run), all as item balls; Gary
gives you the Pidgeotite after your battle on Silph Co. 7F, Sabrina the
Alakazite with the Marsh Badge's TM, and Giovanni the Kangaskhanite with the
Earth Badge's TM. (From a save that won those battles before: Sabrina gives
hers when you talk to her again, Giovanni too if he's still in his Gym, and
otherwise Gary's and Giovanni's are item balls where they stood.)

## Generation 7

The Alola Pokémon are in: all 88 (#722-809, Rowlet to Melmetal), the Alolan
forms of Kanto's eighteen (Rattata to Marowak), and the forms Gen 7's Pokémon
battle in (Lycanroc's Midnight and Dusk, Oricorio's four dances, Wishiwashi's
School, Minior's Core, Mimikyu's Busted form, Silvally's seventeen types,
Necrozma's Dusk Mane and Dawn Wings, Zygarde's 10% and Complete forms,
Greninja's Battle Bond and Ash forms). `tools/build-gen7.js` makes
`data/dex-gen7.js`, `data/learnsets-gen7.js` and `data/moves-gen7.js` from
@pkmn/dex (Showdown's Gen 7 data: types, stats, abilities, Gen 7's level-up,
TM, tutor and Egg moves) and PokeAPI's CSVs (catch rate, Egg steps, Exp. and
EV yields, friendship, growth rate, and the form IDs the sprites are filed
under), with the 53 moves Gen 7 added (not the Z-Moves; Melmetal's Double
Iron Bash from Let's Go). `tools/fetch-gen7-sprites.js` brings their sprites
from PokeAPI's repository (the same 96x96 pictures as the others: front,
back, shiny, shiny back), and the party icons, evolutions (Ice Stone for
Crabrawler and the Alolan Sandshrew and Vulpix, Thunder Stone for Charjabug,
Lycanroc by day, night or at dusk, 5pm to 6pm), Egg Groups and machine
compatibility (any generation's, for Gen 7's Pokémon) are built by the tools
that build everyone else's. A Gen 7 TM this game hasn't got (Brutal Swing,
Smart Strike, ...) isn't learnt by machine. Metronome, a Gen 6 move here,
doesn't call Gen 7's moves. Like the other generations' Pokémon after the
first 386, they have no cries (FireRed has none).

In battle, Gen 7's 42 Abilities work (`data/abilities.js`, num 192-233):
the formes they bring about change the picture, stats and types mid-battle
(Shields Down's Meteor Form and Core, Wishiwashi schooling from Lv. 20 above
a quarter HP, Disguise taking the first hit, Battle Bond's Ash-Greninja after a
knockout, with three-hit 20-power Water Shuriken, Power Construct's Complete
Forme at half HP, its extra HP added), and the in-battle Summary shows the
forme. (Aegislash's Stance Change works the same way: Blade Forme for a
damaging move, Shield Forme for King's Shield and when it leaves the field.
Zygarde's 50% Forme has its own stats: 108 HP, 81 Sp. Atk, 95 Speed.) The
Surges set their terrain, Psychic Terrain among them (1.5x Psychic
moves, no priority moves at grounded Pokémon; Nature Power calls Psychic);
Queenly Majesty and Dazzling also stop priority moves; Dancer copies dance
moves; Wimp Out and Emergency Exit switch out below half HP (not a wild
Pokémon's); Innards Out, Beast Boost, Soul-Heart, Receiver and Power of
Alchemy, Battery, Merciless, Galvanize (1.2x), Liquid Voice, Triage, Long
Reach, Stakeout, Water Bubble, Fluffy, Full Metal Body, Shadow Shield, Prism
Armor, Neuroforce and the rest are as in Sun and Moon. The new moves that need
more than their data are in `data/battle-moves.js`: Shore Up, Floral Healing,
Purify, Strength Sap, Speed Swap, Gear Up, Toxic Thread, Aurora Veil (hail
only; both screens), Baneful Bunker, Laser Focus, Throat Chop, Spirit Shackle
and Anchor Shot (trap), Spectral Thief, Pollen Puff (heals an ally), Psychic
Fangs (breaks screens), First Impression, Burn Up, Core Enforcer, Beak Blast,
Shell Trap, Mind Blown, Plasma Fists, Sparkling Aria, Solar Blade, Stomping
Tantrum, Power Trip, Darkest Lariat, Photon Geyser, Revelation Dance and
Multi-Attack (the user's type). Their Summary descriptions come from
pokeemerald-expansion, like the other moves and Abilities after Gen 3. The
test battles 100 random Gen 7 teams in debug mode. (RKS System needs no
Memories: each Silvally form is its own species.)

**Z-Moves** (Sun and Moon): with the Z-Ring (a key item) and a Z-Crystal
held, START on the move menu turns the moves into Z-Moves (their names show:
Inferno Overdrive for a Fire move, "Z-" for a status move), once a battle.
A damaging move's Z-Move has its power (Flamethrower 175, Showdown's table)
and category, and gets through Protect and the like for a quarter of the
damage; a status move gets its Z-Power bonus first (stat boosts, clearing
drops, full healing, ...). The 18 type crystals, and 15 species' own (Pikanium
Z: Pikachu's Volt Tackle into Catastropika; Guardian of Alola takes 3/4 of
the target's HP; Genesis Supernova leaves Psychic Terrain), come from
`tools/build-z-moves.js` (`data/z-moves.js`). **Ultra Burst** (Ultra Sun and
Moon): Dusk Mane or Dawn Wings Necrozma holding Ultranecrozium Z becomes
Ultra Necrozma (START, with the Z-Ring), whose Photon Geyser becomes Light
That Burns the Sky. **Silvally's Memories**: Silvally holding one takes that
type's form when it comes out (each form is also its own species, as
before). Trainers use their Z-Moves and Ultra Burst. (Pikashunium Z, for
Pikachu in a cap, isn't in.)

All of Zygarde's formes are in: its 10% and 50% Formes, the Complete Forme
that Power Construct makes of either at half HP, and Mega Zygarde (Legends:
Z-A), into which the Complete Forme can Mega Evolve holding Zygardite. The
Zygarde Cube (a key item, used from the Bag on Zygarde) switches it between
10% and 50% and between Aura Break and Power Construct. A Mega Stone only
works for its own species now. `tools/build-extra-forms.js` adds the battle
formes the generation imports left out to `data/dex-forms.js` (Mega Zygarde,
Ultra Necrozma, Dialga's and Palkia's Origin Formes, Eternamax Eternatus and
the Gigantamax formes), with their sprites (Mega Zygarde's drawn from
pokeemerald-expansion's, PokeAPI having none), and
`tools/build-later-item-sprites.js` the pictures of the items they need.

## Generation 8

Galar's Pokémon are in: all 89 (#810-898, Grookey to Calyrex), the Galarian
forms (Meowth to Stunfisk, with Galarian Darmanitan's Zen Mode) and the forms
Gen 8's Pokémon battle in (Toxtricity's Low Key, Cramorant's Gulping and
Gorging, Eiscue's Noice Face, female Indeedee, Morpeko's Hangry Mode, Zacian's
and Zamazenta's Crowned, Rapid Strike Urshifu, Calyrex's Ice and Shadow
Riders), and Legends: Arceus's: its seven (#899-905, Wyrdeer to Enamorus),
the Hisuian forms, White-Striped Basculin, female Basculegion and Therian
Enamorus. `tools/build-gen8.js` makes `data/dex-gen8.js`,
`data/learnsets-gen8.js` and `data/moves-gen8.js` from @pkmn/dex (Sword and
Shield's data; Scarlet and Violet's for Legends: Arceus's, where they battle)
and PokeAPI's CSVs, with the 88 moves Gen 8 added (not the Max Moves). The
sprites come the way Gen 7's do (`node tools/fetch-gen7-sprites.js <csv
folder> gen8`), and the party icons, evolutions, Egg Groups (Galarian and
Hisuian Pokémon hatch as such) and machines (any generation's) are built by
the usual tools. Gen 7's Silvally forms moved to IDs 10500-10516 (PokeAPI
gives Hisuian Pokémon their old IDs). Not in: Gigantamax and Dynamax,
Eternamax, Alcremie's flavours, Dialga's and Palkia's Origin Formes.

Gen 8's evolution items are in the Bag: Tart and Sweet Apples, Cracked and
Chipped Pots, the Galarica Cuff and Wreath, the seven Sweets, Black Augurite,
the Peat Block and Kubfu's Scrolls of Darkness and Waters (pokesprite's
pictures; `tools/build-later-item-sprites.js` draws the last four from
pokeemerald-expansion's). Evolutions the games tie to places or styles keep a
rule this game can check, noted in `data/evolutions.js`: Galarian Farfetch'd
becomes Sirfetch'd after a battle in which it landed 3 critical hits; Galarian
Yamask becomes Runerigus levelling up with 49 HP or more lost; Toxel becomes
Amped or Low Key Toxtricity by its nature; Kubfu reads a scroll; Alcremie
comes from any Sweet; Basculin (White-Striped) becomes Basculegion after
taking 294 recoil damage in all, Hisuian Qwilfish becomes Overqwil after 20
Barb Barrages (both counted on the Pokémon, across battles); Ursaring uses
the Peat Block at night; Stantler becomes Wyrdeer at Lv. 30 (it can't learn
Psyshield Bash here). **Dynamax and Gigantamax**: with the Dynamax Band (a key item), START on
the move menu Dynamaxes a Pokémon for three turns, once a battle: the
picture grows, lit red; its HP goes up by its Dynamax Level (×1.5, and 5%
more a level: Dynamax Candy raises it to 10, ×2); every move is a Max Move
(Showdown's power for each: Max Flare, Max Geyser, ... with their weather,
terrain or stat changes) and a status move Max Guard, which stops even Max
Moves. Max Moves get through Protect for a quarter of their damage. A
Dynamaxed Pokémon can't flinch, be forced out, or be hit by OHKO or
weight-based moves, and Behemoth Blade, Behemoth Bash and Dynamax Cannon do
double damage to it. A Pokémon with the G-Max Factor (Max Mushrooms used on
it make it Max Soup, and take it away again) Gigantamaxes instead, in its
Gigantamax forme, its type's Max Move becoming its G-Max Move (G-Max
Wildfire's four turns of fire, Volt Crash, Befuddle, Steelsurge, Chi Strike,
Replenish, One Blow through any protection, ...). Eternatus doesn't
Dynamax: it becomes Eternamax Eternatus. `tools/build-max-moves.js` writes
`data/max-moves.js`. Trainers Dynamax their last Pokémon when they can (no
trainer has the Dynamax Band yet).

**Terastallizing** (Scarlet and Violet): with the Tera Orb (a key item: the
first time you come into Pewter City, one of Prof. Oak's aides catches up
with you and gives it to you), START
on the move menu Terastallizes a Pokémon into its Tera Type, once a battle;
the Orb is then empty until a Pokémon Center (or blacking out) recharges it.
Every Pokémon has a Tera Type (one of its own types, set when it's made and
kept through evolution; Ogerpon's is its mask's, Terapagos's Stellar), shown on
the Summary's EV / IV page. Terastallized, it is its Tera Type alone for the
rest of the battle, switched out or not (Magic Powder, Roost, Burn Up, Double Shock and
Mimicry can't change it): its Tera Type's moves get 1.5× (2× if it was already
that type; Adaptability 2.25×), its own types' moves keep their 1.5×, and its
Tera Type's moves under 60 power go up to 60 (not priority moves, multi-hit
moves or ones whose power varies). Tera Blast takes its Tera Type, physical if
its Attack is higher. Ogerpon takes its mask's Tera form (Embody Aspect); Terapagos
turns Stellar (Teraform Zero): Stellar keeps its types, gives 2× to them and
1.2× to the rest, and its Tera Starstorm is Stellar (2× against a Terastallized
Pokémon) and hits both foes; Stellar Tera Blast is 100 power and lowers its
Attack and Sp. Atk. As pokeemerald-expansion shows it: the Tera trigger beside
the box, the rainbow, crystal and shards (`tools/build-mega-icons.js` copies
them), the picture tinted halfway to the type's colour and its type's Tera
symbol where "Lv" was. Trainers with a Tera Orb Terastallize for a move of
their Tera Type, with their last Pokémon, or their ace as soon as it's out:
Brock's Onix Terastallizes into a Dragon type, Misty's Starmie into a
pure Psychic type, Lt. Surge's Raichu into a Water type, Erika's Vileplume
into a Poison type, Koga's Mega Beedrill into a Fire type, Sabrina's Mega
Alakazam into a Dark type and Blaine's Mega Houndoom (Lv. 48, with the
Houndoominite; his team here is Magmortar, Magcargo, Rapidash, Arcanine and
Houndoom) into a Dark type (a trainer with an ace keeps the Orb for it). Koga's
team here is Weezing, Muk, Arbok and Beedrill with its Beedrillite. A Mega
Evolved Pokémon can Terastallize too (this game's own), even in the same turn
it Mega Evolves, the Mega Evolution first. Yours too: when it can do both, both
triggers slide out, one picked; START switches the picked one on or off, and
holding START while pressing left or right picks the other (letting go
switches it), so START, then hold START, right, let go, does both.

Alcremie comes in all 63 flavours: a Sweet used on Milcery asks which
way it spins and for how long, and that with the time of day gives its cream
as in Sword and Shield (clockwise and short by day: Vanilla Cream; the other
way and long from 7pm to 8pm: Rainbow Swirl; ...), the Sweet sitting on top
(PokeAPI's pictures for each; pokeemerald-expansion gives one party icon to
all creams). Galar's and Hisui's evolutions of other regions'
Pokémon (Koffing into Galarian Weezing, Quilava into Hisuian Typhlosion)
aren't: this is Kanto.

In battle, Gen 8's 34 Abilities work, among them Intrepid Sword, Dauntless
Shield, Ice Face, Gulp Missile, Hunger Switch, Neutralizing Gas (every other
Ability goes quiet), Gorilla Tactics (a Choice lock), Mirror Armor, Quick
Draw, Unseen Fist, Mimicry, Screen Cleaner, Wandering Spirit, Perish Body,
Ripen (Berries do twice as much), Power Spot and Steely Spirit (Libero, like
Protean here, gives every move the same-type bonus). Zacian with the Rusted
Sword and Zamazenta with the Rusted Shield (held items) are Crowned when
they come out, Iron Head becoming Behemoth Blade or Bash for the battle.
Kleavor's and Hisuian Samurott's Sharpness (Gen 9) is in too. Dialga holding the Adamant Crystal and Palkia
the Lustrous Globe (Legends: Arceus) take their Origin Formes when they come
out, and the items power up their moves as the Orbs do. The moves that
need code are in `data/battle-moves.js` and the engine: Obstruct, Octolock,
Jaw Lock, No Retreat, Court Change, Clangorous Soul, Coaching, Life Dew,
Jungle Healing, Lunar Blessing, Take Heart, Stuff Cheeks and Teatime, Corrosive
Gas, Magic Powder, Tar Shot, Poltergeist, Steel Roller, Steel Beam,
Chloroblast, Eerie Spell, Burning Jealousy, Lash Out, Bolt Beak, Fishious
Rend, Body Press, Shell Side Arm, Terrain Pulse, Rising Voltage, Expanding
Force, Misty Explosion, Grav Apple, Grassy Glide, Meteor Beam, Triple Axel,
Aura Wheel, Stone Axe, Ceaseless Edge, Dire Claw, Barb Barrage, Infernal
Parade, Triple Arrows and the three storms. The test battles 100 random Gen
8 teams in debug mode.

## Generation 9

Paldea's Pokémon are in: all 120 (#906-1025, Sprigatito to Pecharunt), the
Paldean forms (Combat, Blaze and Aqua Breed Tauros, Paldean Wooper) and the
forms Gen 9's Pokémon come in (Bloodmoon Ursaluna, female Oinkologne,
Maushold's Family of Four, Squawkabilly's plumages, Hero Palafin, Droopy and
Stretchy Tatsugiri, Three-Segment Dudunsparce, Roaming Gimmighoul, Ogerpon's
masks and Terastal Terapagos). `tools/build-gen9.js` makes `data/dex-gen9.js`,
`data/learnsets-gen9.js` (Scarlet and Violet's moves), `data/moves-gen9.js`
(the 64 moves Gen 9 added) and `data/items-gen9.js` from @pkmn/dex and
PokeAPI's CSVs; the sprites come as Gen 7's and 8's do (`node
tools/fetch-gen7-sprites.js <csv folder> gen9`), and the party icons
(pokeemerald-expansion's), sprite metrics, evolutions, Egg Groups (Paldean
Pokémon hatch as such) and machines are built by the usual tools. Not in: Koraidon's and Miraidon's travel modes,
and the Artisan and Masterpiece teacups, which look the same. The Hisuian forms
were already in (with Gen 8, above).

Paldea's evolutions of older Pokémon are in too: Primeape into Annihilape
(Rage Fist used 20 times), Girafarig into Farigiraf (knowing Twin Beam),
Dunsparce into Dudunsparce (knowing Hyper Drill), Bisharp into Kingambit,
Applin into Dipplin (the Syrupy Apple) and on into Hydrapple (knowing Dragon
Cheer), Duraludon into Archaludon (the Metal Alloy) and Paldean Wooper into
Clodsire. Their other rules, noted in `data/evolutions.js`: Pawmo, Bramblin
and Rellor evolve once they've walked 1,000 steps in your party (following you
in Let's Go, in the games); Bisharp once it has knocked out 3 Bisharp (Bisharp
holding a Leader's Crest, in the games); Gimmighoul with 999 Coins in your Coin
Case (999 Gimmighoul Coins, in the games); and 1 in 100 Tandemaus become a
Family of Four and 1 in 100 Dudunsparce have three segments, by personality.
The Auspicious and Malicious Armors, Syrupy Apple, Unremarkable Teacup and
Metal Alloy are in the Bag. The Karate Master's rematch team (a Dojo rule: fully
evolved) has Annihilape now where it had Primeape.

**Legends: Z-A's Megas**: all 47 that Legends: Z-A and its Mega Dimension
added, with their Mega Stones (pokeemerald-expansion's pictures): Mega
Clefable, Victreebel, Starmie, Dragonite, Meganium, Feraligatr, Skarmory,
Froslass, Emboar, Excadrill, Scolipede, Scrafty, Eelektross, Chandelure,
Chesnaught, Delphox, Greninja, Pyroar, Floette, Malamar, Barbaracle,
Dragalge, Hawlucha, Drampa and Falinks; Mega Raichu X and Y, Chimecho, Absol
Z, Staraptor, Garchomp Z, Lucario Z, Heatran, Darkrai, Golurk, Meowstic (male
and female), Crabominable, Golisopod, Magearna, Zeraora, Scovillain, Glimmora,
Tatsugiri (each of its forms) and Baxcalibur (Mega Zygarde was already in).
A stone may stand for several: the Meowsticite gives a Meowstic its Mega by
gender, the Tatsugirinite by form. Floette's Eternal Flower is in, but as it
can't be caught the Floettite works for any Floette. Like the other
generations' Mega Stones, the stones for other regions' Pokémon aren't found
in Kanto; the Kanto Pokémon's are, as item balls: the Clefablite deep in Mt.
Moon (1F), the Victreebelite on Route 25, the Raichunite X and Y in the Power
Plant, the Starminite in the Seafoam Islands (B4F) and the Dragoninite in the
Safari Zone's West area.

In battle, Gen 9's 48 Abilities work, among them Protosynthesis and Quark
Drive (in the sun or on Electric Terrain, or with Booster Energy, a held
item: the highest stat ×1.3, Speed ×1.5), Orichalcum Pulse and Hadron Engine,
the four Treasures of Ruin (every other Pokémon's stat ×0.75), Good as Gold,
Purifying Salt, Well-Baked Body, Earth Eater, Wind Rider and Wind Power (with
Tailwind too), Electromorphosis, Guard Dog, Armor Tail, Opportunist, Cud Chew,
Supreme Overlord, Costar, Toxic Debris, Toxic Chain, Mycelium Might, Mind's
Eye, Supersweet Syrup, Hospitality, Poison Puppeteer, Zero to Hero (Palafin's
Hero Form once it's been out and back), Tera Shift and Tera Shell (Terapagos
takes its Terastal Form as it comes out) and Commander (in a double battle,
Tatsugiri goes into an ally Dondozo's mouth as soon as both are out:
Dondozo's stats rise by 2 stages; Tatsugiri disappears, takes no actions and
every move aimed at it misses, though it still takes indirect damage; neither
can be switched or forced out, a fainted Tatsugiri leaves Dondozo bound, and
Dondozo fainting lets Tatsugiri out again; Order Up raises Dondozo's Attack,
Defense or Speed by its Tatsugiri's form), Embody Aspect (Terastallized
Ogerpon's Speed, Attack, Sp. Def or Defense rises by its mask, as it
Terastallizes and each time it comes out) and Teraform Zero (Terapagos turning
Stellar ends the weather and terrain). Legends: Z-A's Megas bring theirs: Dragonize
(Normal moves become Dragon, 1.2×), Mega Sol (its moves as in harsh sunlight),
Piercing Drill (contact moves through Protect, for a quarter), Eelevate,
Fire Mane and Spicy Spray. **Snow** is Gen 9's hail: Snowscape and Chilly
Reception bring it; it does no damage and raises Ice types' Defense ×1.5
(Blizzard can't miss, Aurora Veil works, Weather Ball is Ice; Ice Body, Snow
Cloak, Slush Rush and Ice Face work in it as in hail). The moves that need
code: Rage Fist (stronger for each hit taken), Last Respects (for each
fainted ally), Hard Press, Fickle Beam, Temper Flare, Collision Course and
Electro Drift, Hydro Steam (stronger in the sun), Psyblade (on Electric
Terrain), Ivy Cudgel (Ogerpon's mask's type; the Wellspring, Hearthflame and
Cornerstone Masks, held, give it that form and 1.2× power) and Raging Bull
(Paldean Tauros's breed's type, breaking screens), Ruination, Comeuppance,
Thunderclap, Upper Hand, Glaive Rush, Salt Cure, Syrup Bomb, Psychic Noise
(two turns without healing), Alluring Voice, Burning Bulwark, Silk Trap,
Electro Shot (at once in the rain), Gigaton Hammer and Blood Moon (not twice
in a row), Double Shock, Ice Spinner, Mortal Spin, Shed Tail (its substitute
for whoever comes in), Revival Blessing (mid-turn, its Trainer picks which
fainted Pokémon comes back with half its HP: you on the party screen; in a
double battle one still in its slot goes straight back out), Fillet Away,
Tidy Up, Doodle and Dragon Cheer (its ally's critical-hit ratio up 1 stage, 2
for a Dragon type; not with Focus Energy). Their Summary descriptions are pokeemerald-expansion's. The test
battles 100 random Gen 9 teams. Heal Block works too now (five turns of no
healing: healing moves can't be chosen, and Psychic Noise gives two).

## Faraway Island

Emerald's Old Sea Map event, for Mew. Once the Sapphire is in Celio's machine
he gives you the **Old Sea Map**, Bill's reward for all your help (talk to him again if you'd already done it),
and Vermilion's Seagallop sailor, as FireRed's does with an event ticket, is
amazed the first time ("Oh! That's an Old Sea Map!") and offers the Sevii
Islands or **Faraway Island**: Seagallop Hi-Speed 10 takes you there. The maps
are Emerald's own, `FarawayIsland_Entrance` and `FarawayIsland_Interior`,
drawn from Emerald's tilesets (General, Rustboro, Fortree, with Emerald's
water and flower animations) by `tools/build-emerald-maps.js` from a
[pret/pokeemerald](https://github.com/pret/pokeemerald) checkout into
`data/emerald-maps.js`:

```sh
node tools/build-emerald-maps.js <path to pret/pokeemerald>
```

The shore has the island's faded sign and the Seagallop's sailor to take you
home. Inside, in the long grass, Mew plays hide and seek as in Emerald
(`src/faraway_island.c`, here `game/faraway.js`): it spots you as you come in,
darts into the grass and vanishes; each step you take it takes one too, away
from you if it can (and never trapped between you and one of the four
rocks), shows itself only every 8th step and pauses on the 9th, and walking
up to it, seen or not, finds it: "Myuu…", and a wild Mew, Lv. 50 (Emerald's is Lv. 30). Caught or
beaten it's gone for good; run from, it flies away and is back the next
time you come in. Like Emerald's, the island is no place to Fly from.

## Johto (in progress)

Johto's first maps are built from HeartGold and SoulSilver: **New Bark Town,
Route 29 and Cherrygrove City**, joined to each other and not yet to Kanto
(the debug menu's **Visit Johto (New Bark Town)** takes you there, and its
Pokémon Center trip brings you back). HGSS's maps are 3D, so
`tools/build-johto.js` (with `tools/lib/hgss-map.js`, `nitro.js` and
`narc.js`) draws them the way FireRed would show them, from a
[pret/pokeheartgold](https://github.com/pret/pokeheartgold) checkout:

```sh
node tools/build-johto.js <path to pret/pokeheartgold>
```

It reads the map headers and the overworld matrix, each 32x32-tile chunk's
land data (tile permissions, building placements and its NSBMD terrain
model) and the area's textures, and rasterises the terrain and buildings in
software at 16 px a tile: house fronts and tree trunks drawn upward from
their tiles, as in FireRed, and what stands in front of you (tree tops,
roofs) in the map's `-top` layer. The tiles' permissions become collision and
FireRed's behaviours (tall grass, water, ledges, doors), and from the event
data, scripts and text come the signs ("New Bark Town / Winds of a New
Beginning"), hidden items and the people always there, with what they say
and HGSS's own sprites (`assets/world/sprites/hgss_*.png`, put in FireRed's
frame order). Wild Pokémon are HeartGold's daytime ones (Route 29: Pidgey,
Sentret and Rattata), Surf's, and Gen 4's fishing (five slots a rod,
40/40/15/4/1). Everything goes into `data/johto-maps.js`, which adds the
maps to `WORLD_MAPS`. Not built yet: the houses and Elm's Lab (their doors
say so), Johto's story, music (FireRed's stands in: Pallet Town's, Route 1's
and Pewter City's), water animation, and a Town Map of Johto.

## Orre: the Outskirt Stand (in progress)

Pokémon Colosseum's opening, at the **Outskirt Stand**: a diner made from an
old locomotive out in Orre's desert. It isn't joined to anywhere yet: the
debug menu's **Visit Orre (Outskirt Stand)** takes you there and **Leave Orre**
brings you back (so do its Pokémon Center and Johto trips). In Orre you're
**Wes**: `game/orre.js` puts your own name, look, party, Bag, money and
trainer ID away and brings out Wes's (kept from one visit to the next), with
his partners from the start of Colosseum: **Espeon** (Lv. 25: Confusion,
Return, Reflect, Helping Hand) and **Umbreon** (Lv. 26: Bite, Secret Power,
Taunt, Snatch). Leaving swaps everything back.

The first visit plays the opening. On a black screen Team Snagem's hideout
blows up behind Wes as he gets away with its portable Snag Machine. He rides
his bike in from the south of the desert and parks beside the Stand. Two men
come out of the diner, **Folly** and **Trudly**. They talk about their meal
and the sack in their truck, see Wes, tell him to mind his own business, and
drive off with it. Inside, **Rider Willie** sits at the back. When Wes comes
out again, Willie follows him and challenges him to a **double battle** (every
battle in Colosseum is one) with two Zigzagoon (Lv. 23 and 24). Afterwards he
points Wes north to Phenac City. Losing to Willie doesn't make you black out:
he goes back in and challenges you again next time.

In the diner:
- The bartender serves a free meal that heals your Pokémon, and runs the
  shop once Willie's been battled.
- The TV shows the news.
- The jukebox plays another song.
- The travellers in the booths talk about the road.

North is the way to Phenac City and south the way back to the hideout; both
say they aren't built yet.

Colosseum is 3D, so nothing of it converts. `tools/build-orre.js` builds the
place in the GBA games' style instead, from a
[pret/pokeemerald](https://github.com/pret/pokeemerald) checkout:

```sh
node tools/build-orre.js <path to pret/pokeemerald>
```

- **The ground** is Emerald's Route 111 desert (sand, dunes and red cliffs
  from the General and Mauville tilesets), cleared of its rocks and the
  Mirage Tower.
- **Drawn in code**, pixel by pixel, in FireRed's palette and shading style:
  - the locomotive diner (rusty boiler, smokestack, headlight and
    cowcatcher, "OUTSKIRT STAND" on its side), its wooden shack with the
    door and the orange steps;
  - Folly and Trudly's truck, a blue pickup with the sack in its bed, in
    front, back and side views;
  - Wes's parked bike;
  - the whole interior: plank walls with copper pipes, the curved wooden
    bar with its bottle shelves and stools, the TV with a Poké Ball on
    screen, the jukebox, three green booths and the yellow checkered floor.
- **Wes** is Emerald's Brendan recoloured (overworld walking, running, bike,
  Surf and fishing sheets, and his battle pictures): the white cap reads as
  Wes's silver hair, with a dark coat.
- **Willie** is FireRed's Cool Trainer with pink hair; his battle picture is
  FireRed's Biker with a pink mohawk.
- **Folly, Trudly, the bartender and the travellers** use FireRed's
  sprites.

Everything goes into `data/orre-maps.js`, `assets/world/maps/OutskirtStand*`,
`assets/world/sprites/player_wes*` and `orre_*`, and the `wes` and
`rider_willie` trainer pictures. The words are this game's own, since
Colosseum's script wasn't to hand. The music is FireRed's for now:
- outside: the Sevii Islands' route theme;
- inside: the Game Corner's;
- Willie's battle: Ruby and Sapphire's trainer battle.

## Progression rules (Gen 6)

- **Experience**: the six growth curves, and base exp × level / 7 split between
  the Pokémon that battled, ×1.5 from trainers and with a Lucky Egg. Catching a
  Pokémon also gives experience. EVs come from the defeated species' yield.
  With the **Exp. Share** on (a key item you start with; use it from the bag to
  switch it off and on), each Pokémon that battled gets the full amount
  instead of a split, and the rest of the party (not fainted) gets half, plus
  EVs, as in X and Y.
- **Wild held items**: a wild Pokémon in the grass, on the water, on a rod,
  under a smashed rock or in the Safari Zone may be holding an item:
  FireRed's for its species (`.itemCommon` and `.itemRare` in
  src/data/pokemon/species_info.h), or Emerald's (Ruby and Sapphire's) when
  FireRed gives it none, such as Pikachu's Oran Berry and Light Ball, and
  nothing when neither does (or for anything past Gen 3); `data/wild-items.js`,
  from `node tools/build-wild-items.js <pokefirered> <pokeemerald's species_info.h>`.
  As in FireRed (SetWildMonHeldItem): 50% the common item, 5% the rare one,
  and always the item when both are the same (Shuckle's Berry Juice); a lead
  Pokémon with Compound Eyes makes it 60% and 20%, as in Emerald. Thief and
  Covet can take it, a Berry gets eaten, and caught, it keeps what it still
  holds. The legendaries waiting on the map hold nothing, as in FireRed.
- **Shiny Pokémon**: any Pokémon you meet or are given is shiny 1 time in 1,000
  (trainers' never are). They use their shiny sprites
  everywhere, sparkle as they come out in battle (a wild one too, as it
  appears), have a gold star after their name in a wild battle's healthbox,
  and have a ★ on their summary. (The debug menu's Add a Pokémon has a Shiny
  box.) A wild Pokémon sliding in and showing itself, and a thrown ball
  dropping and shaking, play out in full: A doesn't cut them short.
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
  Revives, Star Pieces and Oval Stones at 10, the vitamins (HP Up, Protein,
  Iron, Calcium, Zinc, Carbos) at 15, the evolution stones at 20,
  every fossil at 30, some held items at 38 and 51, Bottle Caps at 40, Max
  Revives and Rare Bones at 63, the Ability Patch at 70, Gold Bottle Caps at
  80 and the plates at 100. Each fossil is only found in its own caves:
  Kanto's (Helix, Dome, Old Amber) in Mt. Moon; later regions' fossils will
  get caves of their own. The rules are in `game/mining.js`, the screen in `ui/mining.js`.
- **Berry Pouch** (a key item you start with; old saves get it too): use it
  from the Bag (or Select, registered) in a forest (Viridian Forest, Three
  Island's Berry Forest, Six Island's Pattern Bush) to pick berries, this
  game's own minigame (`game/berry-picking.js` has the rules, the screen is
  `ui/berry-picking.js`). A berry tree fills the screen; a meter at the top
  sweeps back and forth over a sweet spot. A (or tapping the tree) shakes the
  tree: on the sweet spot, three ripe purple berries and maybe a gold one;
  near it, a ripe and a green (unripe) one; anywhere else, two green ones;
  shaking again while the tree still sways (a second and a half) is
  over-shaking, three green berries and points off. Berries fall from all
  over the tree, ripe ones slowly, green ones faster, gold ones fastest; move
  left and right (the D-pad, or tapping the ground) to catch them in the
  basket on your head: a ripe one is 10 points, a gold one 30, every good
  catch in a row adds a combo bonus (2 a catch, up to 20), a green one caught
  costs 10 and breaks the combo, and so does letting a ripe or gold one drop.
  A game lasts 30 seconds. You take home a berry and one more for every 60
  points, fewer if you caught many green ones or missed many; your **farming
  level** adds up to as many again (all of them again at level 100), and each
  gold berry brings one from the best tier you can pick. Every berry in the
  game (Gen 3's 43 and the 24 since) is in a tier, by farming level: Basic
  (Cheri, Chesto, Pecha, Rawst, Aspear, Oran, Persim) from 1, Restoring
  (Leppa, Sitrus, Lum and the confusion berries) from 10, Contest (Razz,
  Bluk, Nanab, Wepear, Pinap, Cornn, Magost, Rabuta, Nomel) from 20,
  EV-reducing (Pomeg, Kelpsy, Qualot, Hondew, Grepa, Tamato) from 30, Rare
  contest (Spelon, Pamtre, Watmel, Durin, Belue) from 40, Type-resisting
  (Occa to Roseli, and Chilan) from 45, Pinch (Liechi, Ganlon, Salac, Petaya,
  Apicot, Lansat, Starf, Micle, Custap) from 60, Retaliation (Jaboca, Rowap,
  Kee, Maranga) from 70 and Legendary (the Enigma Berry) from 85; each tier
  you can pick comes up half as often as the one
  below it. Farming XP is 5 a game and 1 for every 10 points; levels go as
  mining's do, and the trainer card shows your farming level.
- **Fly and Transform animations** (FireRed's Move_FLY and Move_TRANSFORM, frame
  for frame): Fly's first turn turns the Pokémon into a ball of shadow that
  squashes, stretches and shoots off the top of the screen, and it stays out
  of sight until it comes down; the second, the ball dives in from the top
  corner through the target (a hit splat, the target shaking). Transform
  (and Imposter) takes the Pokémon to mosaic, 16-pixel blocks in 45 frames,
  changes its picture into the target's, and back. `tools/build-move-anims.js`
  draws the ball and splat from pokefirered.
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
  each place marked with FireRed's blinking wing icon; you land outside its Pokémon Center, FireRed's heal
  locations, and Route 4's Center counts once you've been in) with FireRed's
  Fly animation out of battle (FLDEFF_FLY_OUT and FLY_IN, frame for frame, in
  `ui/overworld.js`): you raise a Poké Ball, your Pokémon slides across a band
  of streaks and cries, the bird leaves its Ball, swoops down for you and
  carries you off as the screen fades; at the other end it swoops in with
  you, drops you on your spot and spirals back into the Ball (from the water,
  just the sound and a fade out; `tools/build-fly.js` makes the bird, the
  streaks and the player's pose and riding pictures), Strength (push
  boulders until you leave the map), Surf onto the water in front of you, Rock
  Smash a rock in front of you (a Pokémon may be hiding under it), Waterfall up
  the falls while surfing. A in front of a tree, a rock, a boulder, the water
  or a waterfall asks as FireRed does when someone in the party can.
  Surfing: the surfing music and sprite, twice walking speed, the map's water
  Pokémon (FireRed's `water_mons`, 60/30/5/4/1%, kept out of the Pokédex's
  area pages and route crowns for now), and walking onto land hops you off.
- **The Bicycle** (from the Bag, or Select once it's registered: key items
  you can use on the map can be registered to Select, Backspace on a
  keyboard; the Bag shows FireRed's SELECT button beside the registered one): riding sprite and cycling music, Emerald's Mach Bike speed, half as
  fast again (it picks up speed going straight: 1.5 times walking pace, then running
  pace, then 6 pixels a frame;
  stopping, turning or bumping into something starts over), wild Pokémon 80% as often (FireRed's rate on a bike), and only
  where FireRed allows cycling (`allow_cycling`): going indoors gets you off,
  and using it indoors gets "Oak: ...! This isn't the time to use that!"
  It also does Emerald's Acro Bike wheelie and bunny hop: press B (X or
  Shift) standing still and you pop a wheelie (up on the back wheel; hold it
  and you can turn, or ride along on the back wheel at the Bicycle's slowest
  pace); hold it 40 frames standing still and you hop on the back wheel
  (Emerald's SE_BIKE_HOP and low jump, 16 frames a hop), in place, turning if
  you press another way, or a tile along (over ledges too) if you press the
  way you face; let go and the front wheel comes down. As in Emerald, hopping
  in place in tall grass can find a wild Pokémon, but a hop in place isn't a
  step: a Repel and the Safari Zone's steps don't count it. FireRed's Bicycle
  has no wheelie pictures, so `tools/build-wheelie.js` draws them from each
  look's bike frames the way Emerald's Acro Bike frames differ from its
  standing ones. On the Bicycle, B doesn't toggle running.
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
| `game/` | Game logic around the engine: party records, the player and their save (`player.js`, `save.js`), bag and Poké Mart (`bag.js`), overworld rules (`world.js`), mining, fishing and farming levels (`mining.js`, `fishing.js`, `berry-picking.js`), evolution, encounters, random teams and the opponent AI |
| `ui/` | Text box and menus (`screen.js`), the battle screen, the overworld (`overworld.js`), FireRed's intro (`intro.js`), and the game flow, story events and menus (`game.js`) |
| `tools/` | Data generators (`npm run build:evolutions`, `npm run build:item-sprites`, `npm run build:maps`, `npm run build:intro`, `npm run build:battle-bgs`, `npm run build:machine-learners`, `npm run build:sprite-metrics`, `node tools/build-slot-machine.js pokefirered` for the Game Corner slot machine graphics) and their shared PNG/GBA/text helpers (`tools/lib/`) |
| `assets/sprites/` | Pokémon sprites (front, back, shiny), item icons, trainer and overworld sprites |
| `assets/tilesets/` | FireRed's tilesets (tiles, palettes, metatiles), the source for the maps |
| `assets/world/` | Generated map images and transparent overworld sprites |
| `assets/intro/` | Generated opening movie, title screen and Oak's speech graphics |
| `assets/battle/` | Generated battle backgrounds (FireRed's battle terrains) |
| `tests/` | Loads every non-UI script and checks formulas, engine regressions, progression rules and AI choices, plus 200 random battles, 120 random double battles and 100 random battles each of Gen 7, Gen 8 and Gen 9 teams; `tests/browser/lib.js` is a Playwright helper for checking things in the real page (it serves the game, loads a save made in Node, and presses keys long enough to register) |

## Script load order

Every file sets a global on `window` (for example `window.DEX` or `window.Battle`),
and later files read those globals, so scripts must load in this order:

1. `data/type-chart.js` → `TYPE_CHART`
2. `data/natures.js` → `NATURES`
3. `data/dex.js` → `DEX`
4. `data/moves.js` → `MOVES`
5. `data/abilities.js` → `ABILITIES`
6. `data/items.js` → `ITEMS`
7. `data/learnsets.js` → `LEARNSETS_GEN6` (`data/learnsets-levelup.js` gives it Scarlet and Violet's level-up moves)
8. `data/machine-learners.js` → `MACHINE_LEARNERS`
9. `data/evolutions.js` → `EVOLUTIONS`
10. `data/item-sprites.js` → `ITEM_SPRITES`
11. `data/sprite-metrics.js` → `SPRITE_METRICS`
12. `data/world-maps.js` → `WORLD_MAPS` (and `data/johto-maps.js`, `data/emerald-maps.js` and `data/orre-maps.js` add Johto's, Faraway Island's and Orre's)
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
