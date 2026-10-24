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
switching), SOUND (mono, stereo or off), VOLUME (0 to 10: music, sound effects and cries), GEAR CALLS (OFF: the Pokégear's phone doesn't ring with chatter),
FRAME (the menus' windows: FireRed's ten window frames; the text box is always
FireRed's message box, as in FireRed) and, from the main
menu, SAVE FILE to load a downloaded save; it's also in the Start menu. Start a
**NEW GAME** and you get FireRed's new-game intro (without its controls
guide): the Pikachu pages (A turns the page, B goes back), then Prof. Oak, who shows you a Nidoran♀ and has you name
yourself on FireRed's naming screen (up to 7 letters on its UPPER / lower / OTHERS keyboard: the D-pad
moves, A types, B deletes, Select changes the page, Start jumps to OK; OK with nothing typed picks a name
for you) before you shrink away into Pallet Town, just outside Red's house. Try
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
swap held items), with FireRed's hand, party panel (its slots blue with a
Pokémon in them, and under one the hand is holding), "which BOX?" popup, box
scrolling and release. A Pokémon put in a box (or sent there when your party
is full) is fully healed, as from Gen 4 on. Your own PC is item storage: Withdraw item on FireRed's
item list, Deposit item from the Bag. There's
also a move tutor who teaches Dream Eater (₽10,000 a time, as often as you like: every move tutor in the game does), a school and the Nickname house.
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
frame as FireRed's do (at level 100 the EXP bar is empty, here and on the summary), your box bobs while you choose, a box shakes when its
Pokémon is hit, and its frame flashes when yours levels up.
Every move has its own animation, pokeemerald-expansion's: its animation
script and the C behind it (the sprites' callbacks, the visual tasks, and the
engine they run on: sprites, tasks, palette fades, backgrounds, scanline
effects), translated to JavaScript and run frame for frame as the GBA runs
them, with its pictures, palettes and backgrounds and FireRed's sound effects
(`ui/battle-anim.js`, `tools/build-battle-anims.py`). The Pokémon in them are
this game's pictures, moved, turned, scaled, recoloured and blended as the
GBA's sprites would be; the battle background is this game's, shaken and
recoloured as the GBA's would be, and covered by a move's own background. The
expansion's other battle animations run the same way: a stat rising or
falling (the stat's colour over the Pokémon, "sharply" for two stages),
being poisoned, burned, paralysed, put to sleep, frozen, confused or
infatuated (on the status and each turn it acts), the weather going on each
turn, Leech Seed's drain, a trapping move's turn, Ingrain's, Aqua Ring's and
Wish's healing, a held Berry eaten, hanging on, Focus Punch's and Tailwind's
set-up, the rooms, a stolen or knocked-off item flying across, a thrown Ball
(the Pokémon shrinks into it in its colour, it drops, shakes and either stays
shut or opens; the Ghost dodges it), and a Pokémon called back into its Ball.
Substitute puts the expansion's doll in the Pokémon's place: it stands there
between turns, the Pokémon comes out from behind it for its own move and
goes back after, hits land on the doll, and it fades when it breaks. Transform
is the expansion's mosaic, the picture changing at its coarsest. Hits,
fainting and running animate too (BATTLE SCENE: OFF
on the Option screen turns them off); a move that misses, fails or is blocked
has no animation, as in FireRed. Text is
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
evolution stones), a trade or a tutor (ABLE / NOT ABLE / LEARNED for the
tutor's move, as FireRed's tutors show it), and for switching in battle (SHIFT, or
SUMMARY to look at a Pokémon as it is in the battle; in battle the Pokémon
fighting is first, and the one sent in takes the place of the one it
replaced, FireRed's battle order).
Then the Bag, FireRed's Bag screen with nine pockets (Items, Medicine,
Power-up, Poké Balls, TMs & HMs, Berries, Held Items, Mega Stones, Key Items;
left / right between them, and each pocket remembers where its ▶ was). Power-up
holds what makes a Pokémon stronger for good (vitamins, Wings, PP Up and PP
Max (FireRed's "Boost PP of which move?", the moves in a window beside it), mints, Rare Candy, Exp. Candies, Ability Capsule and Patch, Bottle Caps), Held Items
what is mainly for holding (Leftovers, Choice items, type boosters, weather
rocks, Light Clay, Iron Ball...), Mega Stones the stones; every pocket shows
FireRed's bag, its pockets opening left, middle, right in turn. In battle the Bag
shows only the pockets with something usable there (Items, Medicine, Poké
Balls, Berries). Old saves simply sort into the new pockets, with FireRed's descriptions under the list
(its own words and line breaks, for the items FireRed has). A opens Use / Give / Toss; Toss asks how
many and throws them away right there. Select (Backspace) picks an item up to
move it, as in FireRed ("Where should the … be placed?", the item in red as it
goes along with the ▶); A or Select puts it down there, B puts it back. A
pocket you've rearranged keeps its order (`player.flags.bagOrder`), new items
after the rest; sorting the Berries forgets theirs. The Ability Capsule switches a
Pokémon between its species' two ordinary Abilities (it asks first; not a
Hidden Ability, nor a species with one). The Ability Patch (as in Scarlet and
Violet; dig it up with the Explorer Kit) switches an ordinary Ability to the
species' Hidden Ability, or the Hidden Ability back to its first ordinary one
(it asks first too); a Hidden Ability stays hidden when the Pokémon evolves. Wings add one EV
in their stat; Wings and vitamins alike go up to 252 in a stat (510 in all), and say which ("Pikachu's base Speed rose."). Exp. Candies (Sword and Shield's) give 100 (XS), 800 (S),
3,000 (M), 10,000 (L) or 30,000 (XL) Exp. Points: each level they bring is told, with its moves to
learn, and then it evolves if it can. Bottle Caps are Hyper Training, as in
Sword and Shield and Scarlet and Violet: on a Pokémon of Lv. 50 or more, a
Bottle Cap raises the IV of one stat you pick (from the ones not already at
31) to 31, a Gold Bottle Cap all of them; unlike those games, where it only
acts as 31, the IV itself changes (for breeding too). A Tin Bottle Cap
(Legends: Z-A's) lowers one stat's IV you pick to 0, at any level. It holds medicine, evolution
stones (each item for evolving says "Evolves certain Pokémon when used."), Rare Candy, vitamins, PP Ups, mints, TMs/HMs, held items, and Key Items:
the Exp. Share, Oak's Parcel, the Town Map and the Fishing Rod (you start
with it, and older saves are given it; see **Fishing** below). In the
Berries pocket, A on a berry also offers **Sort**: the Berries in their
tiers (the berry tree's: Basic, Restoring, Contest, EV-reducing, ...), or
back to A to Z ("The berries are now sorted."). The EV-lowering
Berries (Pomeg, Kelpsy, Qualot, Hondew, Grepa, Tamato) work as from Gen 7:
used on a Pokémon, its stat's EVs go down 10 and it grows friendlier (10, 5
or 2), as their descriptions now say; with no EVs in that stat, "It would have
no effect." Berries sell to any Poké Mart by their tier (the Berry Pouch's
nine, below): ₽50 for the Basic ones, then 100, 150, 200, 250, 300, 350, 425
and ₽500 for the Enigma Berry; Tera Shards for ₽500 each.
After the Bag come FireRed's Pokédex, the **National
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
there) with how many of its Pokémon you've caught, a brown crown once you've
caught all its Grass Pokémon and a gold crown once you've caught them all, and A on one lists them FireRed-style under the titles Grass
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
be ¥… Okay?"), and selling from the Bag for half price (as many at once as
you have, past 99).

Battles open as in FireRed: from the map the screen flashes white twice and
slices away; the wild Pokémon slides in (in shadow) as your trainer does from
the other side, it lights up and appears, and your trainer throws your first
Pokémon's Ball. Repels (from the bag) keep wild Pokémon below your lead's level
away for 100, 200 or 250 steps; **Lures** (Lure, Super Lure and Max Lure, as
in Let's Go, Pikachu! and Eevee!: ₽400, ₽700 and ₽900) do the opposite for as
long, wild Pokémon turning up twice as often (and with no quiet steps after
a battle). Every Poké Mart that sells a Repel sells the Lure of the same kind
beside it. One or the other at a time; when one wears off you're asked whether to use
another of the same kind (as in Black and White). In battle you can fight, use items from the Bag (FireRed's Bag screen, Use on what
can be used right now; an Ether or a Leppa Berry asks "Restore which move?"
in the text box with the moves in FireRed's window at the right, as on the
map), switch, and in wild battles
throw balls or run. The battle's animations (a trainer sending out a Pokémon,
a thrown Ball dropping and shaking, the moves) play out in full: A moves the
text on, and doesn't cut them short. Pokémon gain experience and EVs, level up mid-battle, learn
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
Super Rod one), and levels take 20 XP each up to level 20, then 40, 60, 80
and 100 (level 100 at 5,980 XP). Up to level 9 only the Old Rod's
Pokémon bite; from 10 the Good Rod's too (60/40); from 25 the Super Rod's
(30/40/30); from 50, 15/35/50, and from 75, 5/25/70. From level 50 the Super
Rod's rarer slots come up more often too (35/35/20/7/3, and 30/30/25/10/5
from 75). The XP and any new level are told after "on the hook!", and the
trainer card shows your fishing level. In the Safari Zone it's a Safari
battle. You start the game with the Fishing Rod (in FireRed the Fishing
Guru in Vermilion City gives you the Old Rod); he and his brothers in
Fuchsia City and on Route 12 tell you your fishing level and what's next
(the Route 12 brother then keeps FireRed's Magikarp size record). Old saves have their
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
rules, as the battles do: the mother's first form (or the one that isn't
Ditto's), always the family's baby with no incense needed (Happiny from
Blissey, Azurill from Azumarill, Pichu from Pikachu...), Nidoran♀'s and Illumise's either of the pair, Manaphy's a
Phione; three IVs from the parents, five with a Destiny Knot, a Power item's
stat first; an Everstone's nature; the mother's Hidden Ability 60% of the
time, otherwise her Ability slot 80%; the mother's Poké Ball; Lv. 1 with its
level-up moves, then the Egg moves either parent knows, and the level-up
moves both know (and Volt Tackle with a Light Ball). Eggs ride in the party
(FireRed's Egg box, "Egg" in Pokémon's own case, its icon and Summary page
with the Egg in the middle of its panel and its Egg Watch), can't battle,
hold items, learn moves or be traded, and every 255 steps are a cycle nearer
hatching (two with a Flame Body, Magma Armor or Steam Engine Pokémon in the
party): then
"Huh?" and FireRed's hatching scene (`ui/egg-hatch.js`): the Egg wobbles and
cracks three times, bursts in a white flash, the Pokémon's cry, "… hatched
from the EGG!" to its fanfare, and a nickname if you like.

**Saving**: there's no autosave. Save from the START menu (**Save**) or your
trainer card (**Save now**); every 5 minutes of play, out in the overworld, the
game asks "Would you like to save the game?" too (not in the Safari Zone or
the Bug-Catching Contest, where you can't save). It saves to this browser
(including where you are on the map), and **Continue** picks up from your last
save; the Hall of Fame saves on its own, as FireRed's does. Saves from before the overworld put
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
items, Rock Smash rocks and the Rock Slide tutor, ₽10,000 a time as often as you like; its floors are numbered in the area name popup), and Lavender Town: its
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
while it hums, then dings; the 2F TM counter (every name in the small font, as the long ones must be), the 4F toys and stones, the 5F drugstore (its vitamin
counter also sells the six Wings, ₽300 each); the
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
the top left; up to 50,000 in the Coin Case, as HGSS's holds), get a few from the gamblers,
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
Key from 5F opens for good; the Thunder Wave tutor on 2F (₽10,000 a time, as often as you like), a nap on 9F, Gary on 7F
(Pidgeot, Growlithe, a Gyarados holding its Gyaradosite, which Mega
Evolves, Exeggutor, Umbreon and Alakazam; Lv. 35-40) and the Silph worker there who gives
you a Lapras, Lv. 25; and Giovanni in the boardroom on 11F, where Red comes down
by the warp pad and, without a word, walks over to stand beside you for a tag battle (his
Charizard, holding Charizardite X, Snorlax and Pikachu, Lv. 36; Giovanni has
six: FireRed's Nidorino, Kangaskhan, Rhyhorn and Nidoqueen, with a Dugtrio and
a Persian before his Nidoqueen, his Kangaskhan holding its Kangaskhanite, and both Mega
Evolve): beat him and Team Rocket leaves Silph and Saffron, Red walks back the
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
(or Fly away); Surf from it and you're back on the Bicycle as you land. Cycling Road runs from Route 16's Bikers and Cue Balls down the
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
back (any fossil in your Bag, as often as you bring one: those dug up mining
too, and the Root, Claw, Skull and Armor Fossils into Lileep, Anorith,
Cranidos and Shieldon), the Metronome tutor, and three trades (Garett's Seel, Seelor, for a
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
whose hot spring heals your Pokémon (you and the Pokémon following you sit in
it up to the waist) and whose old man gives you HM08 Rock Smash
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
Dunsparce Tunnel, dug out with a Nugget for you once you're Champion; FireRed
digs it out with the National Pokédex) and the
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
Rocket poaching the cave's Pokémon; she asks for your help and battles two of
them beside you, a tag battle (this game's own: you choose three of yours; her
Dewgong, Jynx and Lapras, about level 40, against FireRed's Grunt and another
with Sneasel, Koffing and Golbat; her back picture is pixelled from her front
one over Leaf's pose, `tools/build-lorelei-back.py`), then her Lapras gets the truth out of him (the Pokémon are in the Rocket Warehouse
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
at your best Pokémon's level with FireRed's movesets for them, what they say
is FireRed's Easy Chat, and there's no Exp. or money and no healing on the way
but the lobby's nurse. This game's own: each trainer you beat earns **Battle
Points** (1 BP on floors 1-3, 2 on 4-6, 3 on 7 and 8; a double battle's pair
count as two), and the gentleman by the lobby's right-hand counter teaches a
Pokémon any of its tutor moves for BP (on the Move Relearner's screen, each
move's price under the list: 16 BP for a status move, else 8 up to 60 power,
16 up to 80, 24 up to 100, 32 above; and Pokémon XD's purification moves,
the four each Shadow Pokémon has on being purified (Serebii's Gen 3 "Special
Attacks", from PokeAPI's data: Zapdos's Baton Pass, Extrasensory, Metal Sound
and Thunderbolt, Lugia's Psycho Boost and the rest: `XD_PURIFICATION_MOVES` in
data/machine-learners.js, built by `tools/build-xd-moves.js`); the old woman beside him teaches its
Egg moves (any its evolution line could have hatched knowing) at the same
prices; and the lobby's shop is a BP Shop instead of a Poké Mart: Bottle Cap
25 BP, Gold Bottle Cap 75, Tin Bottle Cap 10 (one IV down to 0, for Trick
Room), every mint 25, the six vitamins 2 each, and the competitive held items:
48 BP for Choice Band, Specs and Scarf, Leftovers, Life Orb, Assault Vest,
Rocky Helmet, Eviolite and Focus Sash; 32 for Eject Button, Red Card, Expert
Belt, Weakness Policy, Shell Bell, Black Sludge, Light Clay, Big Root, Air
Balloon, Safety Goggles, Destiny Knot and Ability Capsule (Ability Patch 64);
16 for the Orbs, lenses, Muscle Band, Wise Glasses, Quick Claw, Razor Claw,
Focus Band, the Herbs and Sitrus and Lum Berries (`BP_HELD` in ui/game.js). Lose and
you're back at the counter. The tower's owner on the roof stops the clock, tells you your time,
hands over the challenge's rewards and says whether you've set a record; the
best times are on the lobby's Time Board, and the elevator takes you back
down. The rewards are this game's (not FireRed's once-only prizes): every
challenge finished draws items from one pool, whatever the mode, and the
faster the finish the better the draw (Single, Double and Mixed count as fast
under 8 minutes and middling under 15; Knockout, three battles a floor, under
16 and 30). A slow finish draws vitamins, PP Ups, mints and everyday held
items (Quick Claw, King's Rock, Leftovers, Metal Coat, Dragon Scale,
Up-Grade...); a middling one adds Bottle Caps, PP Maxes and the stronger held
items (the Choice items, Life Orb, Focus Sash, Assault Vest, Eviolite...); a
fast one adds Gold Bottle Caps, Ability Capsules and the Ability Patch. A
slow, middling or fast finish gives one, two or three items; a Knockout two
more than that. The owner gives Battle Points for the finish too, by the same pace:
5, 10 or 15 BP (a Knockout 5 more), on top of each trainer's. Canyon Entrance and Sevault
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
too. On Route 22, Leaf is waiting on your way to the League (where FireRed has
its late rival, with the same triggers): Butterfree (47), Wigglytuff (47),
Nidoqueen (48), Politoed (48), her starter fully evolved (50) and her ace,
Dragonite (53), which Mega Evolves with its Dragoninite and Terastallizes into a
Flying type; losing blacks you out. Past the League gate's guard (Boulder Badge), Route 23's seven guards each
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
(`game/league-road.js`). Coming out of Victory Road (a step out of the cave's
mouth first), Gary comes down from the Indigo Plateau to meet you: his Silph Co. team at about level 50, Pidgeot,
Arcanine (his Growlithe's evolved), Gyarados (Mega, with its Gyaradosite),
Exeggutor, Alakazam and Umbreon (53, his ace). **Gym Leader rematches**
(this game's own): once you're the Champion, Kanto's Gym Leaders (but
Giovanni) battle you again in their Gym, once a day of the game's clock (lose, and
they'll take you on again that day), with stronger teams: HeartGold and
SoulSilver's rematch teams for Brock, Misty, Lt. Surge, Erika, Sabrina and
Blaine (Lv. 52 to 62) and Koga's from HGSS's Elite Four rematch (Lv. 60 to 64,
his Mega Beedrill his ace); not Giovanni. Each one's ace Terastallizes as in your first battle (Brock's
Onix into a Dragon type, Misty's Starmie a Psychic, ...), and Sabrina's
Alakazam and Blaine's Houndoom Mega Evolve again. Out the far side and up Route 23 is the Indigo
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
over from Lorelei (FireRed's EventScript_ResetEliteFour). Then Red, the
Champion (where FireRed has Gary), to the Champion's music: Pikachu (58),
Espeon (59), Blastoise (60), Venusaur (60), Snorlax (61) and his ace, Charizard
(63), which Mega Evolves with its Charizardite Y. Beaten, Prof. Oak comes
in (your following Pokémon back in its ball meanwhile), congratulates you, has a word with Red and takes you up to the Hall of
Fame; his words there, the record machine, and FireRed's Hall of Fame screen:
your team saved on record ("SAVING… DON'T TURN OFF THE POWER."), each Pokémon
in turn with its cry, number, name, level and ID No., "Welcome to the HALL OF
FAME!" with applause and confetti, then you, your name, ID No. and time, and
"LEAGUE CHAMPION! CONGRATULATIONS!". Then the credits: out in front of the
Indigo Plateau Red (FireRed's Gary) runs off, Prof. Oak looks at you and walks
off, you run off too, and FireRed's credits roll over Kanto's towns and routes
(FireRed's staff, timings and scenes, each drawn with the maps joined to it, as
Route 10's runs on into Lavender Town; with Charizard, Venusaur, Blastoise and
Pikachu, to THE END; Start or B skips them, the first time too). You wake up at home in
Pallet Town, Champion (FireRed's FLAG_SYS_GAME_CLEAR; blacking out takes you
home again until you use another Pokémon Center), and Red's Mom has heard the
news. The League can be challenged again (the Elite Four's rematch words
once you're Champion; FireRed's rematch teams, Lorelei's to Lance's from its
data, and Red's at FireRed's rematch Champion levels, 72-75, once the Sevii Islands' story sets
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

Johto's music is HeartGold's own: `tools/build-johto-audio.js` converts the
songs in pret/pokeheartgold's sound archive (`gs_sound_data.sdat`: its
sequences, instrument banks and ADPCM waves) into `assets/audio/johto-music.js`,
which `game/nds-sound.js` plays the way the DS's sound player does (decibel
envelopes and volumes, 16 channels, 32,728 Hz); both load only once a Johto
song is wanted. Songs are named `gs_` + HGSS's sequence (`gs_t_wakaba`, New
Bark Town's), and in Johto the battles (wild, trainer, Gym Leader, Silver,
Team Rocket, the legendary beasts), their victories, the "eyes meet" themes,
cycling, surfing and the jingles are HGSS's (`tools/lib/hgss-music.json` lists
each sequence's song for the maps):

```sh
node tools/build-johto-audio.js pokeheartgold
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

Johto's Town Map comes from HeartGold's Pokégear map
(`files/application/pokegear/map/pgmap_gra`, its places' squares in
`src/application/pokegear/map/pokegear_map.c`, Fly's landing spots in
`asm/unk_0203BA5C.s`) redrawn square by square in FireRed's region-map tiles:
`tools/build-johto-town-map.js` writes `assets/town-map/johto.png` and
`tools/lib/johto-town-map.generated.js` (`window.JOHTO_TOWN_MAP`: its grid,
names, each Johto map's place and where Fly lands), which
`tools/build-johto.js` puts at the end of `data/johto-maps.js`:

```sh
node tools/build-johto-town-map.js <path to pret/pokeheartgold> pokefirered
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

**EVOLVE** (this game's own): on the Start menu's party screen, under SUMMARY, for a Pokémon that
could evolve now by its level, friendship, time or the like and didn't (stopped with B, or kept
back): it evolves, the scene as levelling up would show it. A Pokémon holding an **Eviolite**, as one
holding an Everstone, doesn't evolve (but by a stone or the like used on it).

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

`tools/build-battle-anims.py` converts pokeemerald-expansion's battle
animations: it assembles `data/battle_anim_scripts.s` as the ROM has it
(through the expansion's preproc and arm-none-eabi-as), translates
`src/battle_anim*.c` and the engine under them (`sprite.c`, `task.c`,
`palette.c`, `bg.c`, `scanline_effect.c`, `trig.c`, `pokeball.c`) to
JavaScript through libclang (`tools/battle_anims/`), and decompresses the
pictures, palettes and tilemaps they name (the Substitute doll and the Balls
among them), into `ui/battle-anim-code.js` and `ui/battle-anim-data.js`, with
the general, status and special animation tables, the stat animations'
arguments, the Balls' ids and each battle environment's Secret Power; the
doll's pictures go to `assets/battle-anims/`. `ui/battle-anim.js` plays a
move (`play({ move, ... })`) or one of the tables' animations (`play({ anim:
"general" | "status" | "special", id, arg, ball, ballCase, substitute })`).
Not played: the Safari Zone's and the catching tutorial's throws (a trainer's
sprite), the Pokéblock throw and the Silph Scope's ghost (tilemaps this
runtime hasn't), and the level-up flash (the healthboxes are this game's).
It needs clang with Python's libclang, binutils-arm-none-eabi, pyelftools and
Pillow:

```sh
git clone --depth 1 --filter=blob:none --sparse https://github.com/rh-hideout/pokeemerald-expansion expansion
cd expansion && git sparse-checkout add data/ src/ include/ asm/ constants/ graphics/battle_anims/ \
  graphics/pokemon/ogerpon/ graphics/balls/ graphics/interface/ tools/preproc/ && make -C tools/preproc && cd ..
python3 tools/build-battle-anims.py expansion
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
`LEVELUP_SOURCE`); TMs are as before, and each Pokémon's Egg moves and tutor
moves gain every one it has had in any game, Gold and Silver to Scarlet and
Violet (PokeAPI's every version group; `pokemon_move_methods` 2 and 3). A move learned on
evolving (level 0 there, as Charizard's Air Slash) is learned when it evolves.
Thousand Arrows and Thousand Waves aren't in the game, so Zygarde goes without. One
addition of this game's own: Charmander, Charmeleon and Charizard still
learn Metal Claw at 13, as in FireRed, for Brock's Rock types. Every
trainer's Pokémon (Gym Leaders, the Elite Four, rivals and everyone on the
maps; not Trainer Tower's, which keep FireRed's sets) knows the last four
moves it learns by its level.

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

The naming screen is FireRed's `src/naming_screen.c`: `tools/build-naming-screen.js`
draws its backgrounds (the menu tilemap and the three keyboard pages, in their
palettes) and cuts out its sprites (the page button and its labels, BACK, OK,
the cursor, the arrow and underscores) into `assets/naming-screen/` (it needs
`graphics/naming_screen/`):

```sh
cd pokefirered && git sparse-checkout add graphics/naming_screen/ && cd ..
node tools/build-naming-screen.js pokefirered   # or: POKEFIRERED=pokefirered npm run build:naming-screen
```

`ui/naming-screen.js` runs it with FireRed's key layout, cursor wrapping, page
swap and button flashes, the text in FireRed's font.

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
connected maps you walk straight into, long grass (Faraway Island's) you
walk in, not on (FireRed's FLDEFF_LONG_GRASS: its sprite over the feet of
whoever stands in it, you, your Pokémon or anyone else, rustling as they step
in; ordinary tall grass leaves you in view), footprints you leave in sand (Emerald's: deeper in the desert's deep sand,
tire tracks on the Bicycle, curving where you turn; gone after a moment, flickering out), and tall grass encounters at the map's
rate (Random() % 2880 < rate × 16) using the 20/20/10/10/10/10/5/5/4/4/1/1
encounter slots. Wild Pokémon come from both versions: where LeafGreen's table
has a different Pokémon in a slot (Sandshrew for FireRed's Ekans on Route 4),
either is as likely. The three starters are out in the wild, 5% each: Bulbasaur in Viridian Forest, Charmander on Route 3 and Squirtle on Route 24. FireRed's TMs found in item balls become this game's
machine for the same move (TM09 Bullet Seed is TM100 here). An Escape Rope works
where FireRed allows it (caves, Viridian Forest) and takes you back to where
you last went from outdoors through a door or cave entrance, one step out from it as in FireRed (UpdateEscapeWarp),
with FireRed's Escape Rope warp (Task_EscapeRopeWarpOut / WarpIn): you spin faster and faster and rise up off the
screen as it fades, then come down at the way in, spinning until you face south. The Berry Powder man in Cerulean gives you the Powder Jar once you've a Berry and sends you to the Direct Corner's Berry Crush (or crushes your Berries himself, at the Berry Crush's amounts), and swaps the powder for his FireRed prizes; the sign in his house shows your Berry Crush records. Trainers work as in FireRed: one you haven't beaten sees you
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
and Museum guide walking you over, the Museum's ₽50 ticket, the Old Amber (and, in its room, this game's own fossil doctor, who revives fossils as Cinnabar's does: one left with either is ready from either once you've left and come back),
the Seismic Toss tutor, Brock (Zubat, Geodude, Vulpix and Onix) with the Boulder Badge and TM39, Leaf waiting outside the Gym
afterwards (she waits a few steps from the door, sees you and walks over) for a battle (Butterfree, which Terastallizes into a pure Flying type, her starter and a Jigglypuff; beat her and she gives you TM54 False Swipe), the Mega Punch and Mega Kick tutors (who teach
again and again, for ₽10,000 each time), the
Magikarp salesman, Super Nerd Miguel and the Mt. Moon fossils, Jessie & James
climbing down the last ladder in Mt. Moon as in Yellow (a double battle; they're back,
as in Yellow and each time a double battle, on Rocket Hideout B4F on the way to Giovanni
with Koffing, Meowth and Ekans at 25, on Pokémon Tower 7F before Mr. Fuji with Meowth,
Arbok and Weezing at 27, and on Silph Co. 11F just off the warp pad from 7F with
Weezing, Arbok and Meowth at 31), Gary in Cerulean (FireRed's team, with
his Eevee, which knows Shadow Ball and Terastallizes into a Ghost type), the Nugget Bridge Rocket (a Nugget, then a battle), the Rocket in
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
Route 6 comes into Vermilion (Butterfree 18, which Terastallizes into a Flying type again, Wigglytuff 20, Nidorina 21 and her
second-stage starter 22), Red on the S.S. Anne where FireRed has Gary (Pikachu
24, which knows Surf and Terastallizes into a Water type, Charmeleon, Wartortle and Ivysaur 25), the seasick Captain's HM01 Cut, the
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
trade evolutions happen; he only takes a Pokémon that would evolve, and his
party screen marks each one ABLE or NOT ABLE), and Bill: a
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
has been studying Mega Evolution and tests everyone. One at a time, you and the
next one step away from the others, down the floor, to battle face to face, then
they go back to their place: Leaf (Butterfree, Wigglytuff, Nidorina, then Vulpix, Gloom or Poliwhirl
by her starter, then her starter's second stage; Lv. 27-31), Gary (Pidgeotto,
Growlithe, Gyarados, Exeggutor, Umbreon) and Red (Pikachu, Charmeleon,
Wartortle, Ivysaur, Espeon). Each one's ace Terastallizes as before: Leaf's
Butterfree into a Flying type, Gary's Umbreon into a Ghost type and Red's Pikachu,
knowing Surf, into a Water type. Oak heals your Pokémon before the first battle,
and after each one he walks down to you to heal them and goes back to his
place, and you go back to yours. You have to
win all three: lose one and you black out as usual, and the test starts over
when you come back. Win them all and you step up to Oak for the Mega Ring and
the Kanto starters' Mega Stones (Venusaurite, Charizardite X and Y,
Blastoisinite), and step back; then Leaf, Gary and Red, one at a time, step up
to him for Mega Rings of their own. Then Red (without a word), Leaf and Gary (each
with a parting word) go down the stairs, Oak heads back to his research, and
only then does Mr. Fuji come over: impressed by your battling, he gives you the
Gengarite and goes home to the Pokémon House.

With the Mega Ring, a Pokémon holding its Mega Stone can Mega Evolve once a
battle: in the move menu, START switches Mega Evolution on for the move you
pick, shown as pokeemerald-expansion shows it: its Mega trigger slides out
from behind your healthbox while you choose a move and lights up while it's
on. A Mega Evolved Pokémon's healthbox (either side, singles or doubles) shows
the expansion's Mega symbol in place of "Lv" (tools/build-mega-icons.js), and
a Tera type's mark by its name when it's Terastallized too: both at once.
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

**The older games' TM item balls** (this game's own): every TM that's an item
ball in Red, Blue and Yellow, or Gold, Silver and Crystal, is one here too, in
the same place: beside the ball FireRed or HeartGold put there instead (Mt.
Moon's Bullet Seed, where Water Gun was), unless that map has a ball of the same
TM already. Red, Blue and Yellow's: Water Gun (Mt. Moon 1F), Mega Punch (Mt. Moon
B2F), Reflect (Power Plant), Horn Drill, Double-Edge and Razor Wind (Rocket
Hideout B2F, B3F, B4F), Pay Day (Route 12), Rage (Route 15), Thunder Wave (Route
24), Seismic Toss (Route 25), Whirlwind (Route 4), Teleport (Route 9), Body Slam
(the S.S. Anne), Egg Bomb and Skull Bash (Safari Zone East and North), Earthquake,
Take Down and Swords Dance (Silph Co. 10F, 5F, 7F), Sky Attack, Submission, Mega
Kick and Explosion (Victory Road). Gold, Silver and Crystal's: Endure (Burned
Tower B1F), Snore (Dark Cave), Rest (Ice Path B2F), Detect (Lake of Rage), Defense
Curl (Mt. Mortar 2F), Steel Wing (Rock Tunnel 1F), Solar Beam (Route 27), Rollout
(Route 35), Swift (Union Cave B1F) and Earthquake (Victory Road 3F). Each is on
open floor you can reach, blocking no way through, ladder or door, no boulder's
path and no spinner's or ice's slide. And a Metal Coat lies in Rock Tunnel (B1F).
Johto's own item balls give HeartGold's TM by its move (its TM82 is Sleep Talk,
this game's TM87).

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
that build everyone else's. Gen 7's TMs are here (Brutal Swing,
Smart Strike, ...: TM166 on, below). Metronome, a Gen 6 move here,
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
first time you come into Pewter City, one of Prof. Oak's aides runs up
behind you and gives it to you), START
on the move menu Terastallizes a Pokémon into its Tera Type, once a battle;
the Orb recharges itself after every battle. Its trigger is always offered,
beside a Z-Move's, Dynamax's or Ultra Burst's too (only Mega Evolution can
go with it in the same turn). **Effect Spore** (and any status given by another Pokémon's Ability)
says so: "Machamp has been paralyzed due to the wild Breloom's Effect
Spore!". **Wild Tera Pokémon** (this game's own, as in
Scarlet and Violet): one wild Pokémon in ten (not in the Safari Zone) has a
random Tera Type: once you're both out, "The wild … is Terastallizing!" and it
Terastallizes, animation and all, then battles as a
trainer's Pokémon does (its Tera symbol after its name and gender, clear of the
ball that marks a species you've caught); knock it out and you get 3 Tera Shards of its Tera
Type, or catch it and it keeps that Tera Type. **Tera Shards** (one kind
for each type, in the Power-up pocket): 50 of a type, used on a Pokémon,
change its Tera Type to that type (not Ogerpon's or Terapagos's).
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
them), the picture tinted halfway to the type's colour (an SVG filter, so it
works opened straight from the file too) and its type's Tera symbol in the
box (this game's way: under the start of its name, left of "HP", so "Lv"
stays; on theirs, after a status icon if there is one). Trainers with a Tera Orb Terastallize for a move of
their Tera Type, with their last Pokémon, or their ace as soon as it's out:
Leaf's Butterfree outside Pewter Gym Terastallizes into a pure Flying type,
Brock's Onix into a Dragon type, Misty's Starmie into a
pure Psychic type, Lt. Surge's Raichu into a Water type, Erika's Vileplume
into a Poison type, Koga's Mega Beedrill into a Ground type, Sabrina's Mega
Alakazam into a Dark type and Blaine's Mega Houndoom (Lv. 48, with the
Houndoominite; his team here is Magmortar, Magcargo, Rapidash, Arcanine and
Houndoom) into a Dark type (a trainer with an ace keeps the Orb for it). Koga's
team here is Weezing, Muk, Arbok and Beedrill with its Beedrillite. Giovanni's
Gym team is Rhydon, Persian, Nidoqueen, Nidoking and his ace, Mega
Kangaskhan (Tera Fighting); Sabrina has Jynx in Kadabra's place. The Elite
Four, first battle and rematch alike: Bruno has Hitmontop in his second
Onix's (Steelix's) place; Agatha has Hisuian Typhlosion, Cursola, Alolan
Marowak, Mismagius and her ace, Mega Gengar (Tera Dark); Lance has Kingdra
and Mega Charizard X where FireRed has his Dragonairs (the rematch's
Dragonite and Kingdra), and his Dragonite Terastallizes into a Flying type
(TEAM_SWAPS in `ui/game.js`). A Mega
Evolved Pokémon can Terastallize too (this game's own), even in the same turn
it Mega Evolves, the Mega Evolution first. Yours too: when it can do both, both
triggers slide out, one picked; START switches the picked one on or off, and
holding START while pressing left or right picks the other (letting go
switches it), so START, then hold START, right, let go, does both.

**Tera Raid dens** (this game's own, after Scarlet and Violet's Tera Raid
Battles; `game/raid-dens.js`): eighteen dens, one of each type: Route 1
(Normal, in the flower meadow), Viridian Forest (Bug, its south-west
corner below the tall grass), Seafoam Islands 1F
(Ice), the Power Plant (Electric), the Fighting Dojo's back room (Fighting),
Rock Tunnel 1F (Rock), Diglett's Cave (Ground), Route 25 by the sea (Water),
Route 18 among the Bird Keepers (Flying), Mt. Ember on One Island, just inside from Kindle Road (Fire), Pokémon
Tower 1F (Ghost), Silph Co.'s lobby (Steel), outside the Indigo Plateau
(Dragon), Celadon's Berry Farm (Grass), the Pokémon Mansion 1F (Poison),
Mr. Psychic's back room (Psychic), the Rocket Hideout B1F (Dark; its
Pokémon are Umbreon and Alola's Dark forms, no Galarian Moltres) and Mt.
Moon B2F (Fairy). Talking to a den tells you its type. A den sleeps until you
use a Lure on it (talk to it); then it glows, with a beam of light, holding a
raid of 1 to 5 stars until you win it. Its Pokémon are all Kanto's: Kanto's own
(not the legendaries or starters), their regional forms (Alolan Sandshrew,
Hisuian Growlithe, ...) and their later evolutions (Scizor, Magnezone,
Crobat, ...); a raid's Metapod knows Tackle and its Kakuna Poison Sting, as
their pre-evolutions do. How many stars is random: 1 with no
Badges, up to 2 with two, 3 with four, 4 with six and 5 with all eight; a
Lure brings 1 or 2 stars, a Super Lure 3 or 4 and a Max Lure 5, and a Lure
stronger than your Badges allow brings the most they do (a Max Lure with six
Badges, 4 stars). The raid is a
battle with its Pokémon (from each type's list for that many stars, at Lv.
12, 20, 35, 45 or 75 as in Scarlet and Violet, and up to 3 more, with IVs of 10 to 31), which
comes out already Terastallized into the den's type (no animation: its
Tera colours and symbol, after its name, from the start), with a competitive
moveset (`RaidDens.movesetFor`: its strongest move of the den's type first, Tera
Blast if it has none, its own types' best, a setup or status move such as
Swords Dance, Calm Mind or Will-O-Wisp, and coverage; from what it learns by
level and, from 3 stars, its TMs, tutor and Egg moves; never Explosion and the
like, a charging or recharging move, or a one-hit KO) and has 5, 7.5, 10, 15 or 20 times
its HP (2, 3, 4, 6 or 8 times, two and a half times over, for the four of
you); it battles as a trainer's Pokémon does, and can't be caught
mid-battle. As in Scarlet and Violet it also acts outside its turn: from 2
stars once its HP falls past half, from 4 stars past two thirds and one
third, and at 5 stars past three quarters, half and a quarter; and at the end
of every 5th turn (3 stars), 4th (4 stars) or 3rd (5 stars). Each time it
does what it most needs: "The Tera Raid Pokémon nullified the stat changes
affecting your side!" if any of you has a stat raised; else it shakes off its own
stat drops and status ("...removed the negative effects affecting it!");
else, as likely either, it raises its better attacking stat and its weaker
defence ("...is getting even stronger!") or attacks again. You send in one Pokémon, chosen from your party when you take
the raid on (as in Scarlet and Violet), and **three others join you**, four
on one as in Scarlet and Violet's raids: first you may invite others
("Invite others to the raid?"): any of Kanto's Gym Leaders you've beaten
(not Giovanni), and the Elite Four once you've beaten them (it counts once
and for good: the League starting over doesn't take it back, and entering the
Hall of Fame counts for all four), your rival (by the name you gave him) once
you've beaten him at Victory Road or are Champion, Red once he's battled beside you at Silph Co. and Leaf once she has
in Pokémon Tower, each bringing the one of their own Pokémon that hits the
raid's Tera Type hardest, from their highest-levelled team in the game (of every
team they battle with in it: the Gym Leaders' rematch teams, the Elite Four's
rematch teams or, for Bruno and Lance, Johto's League's if higher, Red's at
Mt. Silver, your rival's and Leaf's last) (up to three in all: A on a name invites them, B
takes back the last one invited, "+" marks those coming; the list scrolls,
six rows, clear of the text box), and the rest
of the places fill with trainers from the den's region (FireRed's own,
"Bug Catcher Garret", "Crush Girl Sharon": those with a Pokémon that hits the
Tera Raid Pokémon's Tera Type hardest first). Each brings one Pokémon at about
the raid's level: a trainer the Pokémon of their own highest-levelled team (their
rematches' too) that hits it hardest, as it is (not evolved past it), with a moveset chosen against the raid's Tera Type: its strongest super
effective moves first, then its own types'. They battle alongside yours (`game/raid-dens.js`
`RaidDens.allies`, and the engine's `raidAllies`): each turn each uses its
strongest move against the Tera Raid Pokémon (a super effective one before a stronger neutral one), which aims at any of the four
of you; what they do is told in words ("Misty's Lapras used Ice Beam!"), and
their HP shows in the corner of the screen. You have 10, 12, 15, 20 or 25 turns to win (as Scarlet and
Violet's raids have a time limit): told at the start, then "3 turns left!",
"2 turns left!" and "This is the last turn!"; out of turns, "The Tera Raid
Pokémon's power grew too strong!" and you're blown out. Your Pokémon doesn't
stay down, as in Scarlet and Violet: when it faints it gets back up at full
HP (its stat changes and conditions gone, its move that turn lost) and the
raid loses 2 turns; so do your allies'. Run out of turns and you're thrown out of the den (your
Pokémon are restored) and it keeps glowing. Win and the battle goes on: the Tera Raid Pokémon stays there,
worn out, and you're asked whether to catch it; YES, then which of your
Balls (any but the Master Ball), and FireRed's throw and catch (it can't miss; it keeps its Tera
Type). Then a FireRed-style screen of what you won (`ui/raid-rewards.js`:
the stars and the Pokémon beaten, then the money and each item with its
icon and how many, six to a page): money (₽1,500 / 3,000 / 6,000 / 10,000
/ 20,000), Exp. Candies (XS for 1 star up to L and XL for 5), Wings for 1 and
2 stars (5 and 10) and vitamins from 3 stars (2, 3 and 5) and Berries (2 to 6: everyday ones for 1 star, Sitrus and Lum, the
EV-lowering ones and the rare pinch Berries further up) and Tera Shards of
the den's type (4, 6, 10, 15 or 25); and the den goes to sleep again. A
den doesn't turn to face you when you talk to it (it's inanimate, as item
balls are). The Fighting Dojo's back room is behind a
sliding door in its back wall, which the Karate Master opens once you've
beaten him (he tells you of the den). Mr. Psychic's back room is behind a
door in his house's back wall, open once he's given you his TM (he tells
you of the den then, and again after). The Grass den is on the lawn of
Celadon's Berry Farm (below). `tools/build-raid-dens.js` draws the dens,
builds the two rooms from their buildings' own tiles, draws the doors and
opens the way to the farm, into `data/raid-den-rooms.js`. A raid left glowing in a den that has since moved
or changed type is gone.

**Celadon's Berry Farm** is through a gap in the trees south of Celadon's
Gym: a field of its own (`tools/build-berry-farm.js`, from a pret/pokeemerald
checkout), ringed by FireRed's trees as Celadon is, the field in Emerald's
tiles, laid out as X and Y's Berry Fields on Route 7: inside a fence, three
beds of Emerald's soft soil with a row of grass between them, 10 places to
plant in each (30 in all). Its caretaker by the gate gives you the
**Wailmer Pail**. Berry growing is Emerald's (`ui/berry-farm.js`, after
`src/berry.c` and its berry tree scripts): talk to the soft, loamy soil to
plant any Berry from your Berries pocket (the Bag opens on it, on the Berry
you planted last), and it grows through Emerald's stages, drawn with
Emerald's berry trees: planted, sprouted, growing taller, flowering, then
with berries, which stay on the tree until you pick them. Each stage lasts
that berry's own time (Emerald's `stageDuration`: Cheri 3 hours a stage,
Sitrus 6, Lum 12, Spelon 18, Liechi 24; berries since Emerald grow as one of
its trees, the type-resisting ones 18 hours a stage and the rest 24, as in
Diamond and Pearl) on the game's step clock (100 steps an hour, wherever you
walk). Water it once in each of its first four stages for more berries
(Emerald's yield, from the berry's fewest to its most); as in X and Y you can
see which want water (a pale mound of dry soil round the tree) and which have
had it this stage (dark, wet soil). This game's own: the higher your farming
level, the faster everything grows, 1 + level / 50 times as fast (twice at
level 50, three times at 100), and the more you pick, 1 + level / 100 times
as many (twice at 100); the caretaker tells you both. Planting earns 1
farming XP and picking 2 for each berry.

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

## Stadium Island

This game's own, **Pokémon Stadium's content** on a Sevii island (`tools/build-stadium-island.js`
paints its outside with the painter Johto uses, from a layout drawn there: a beach island,
a plaza from the Seagallop's pier to the Stadium's door, a stretched Kanto building for the
Stadium; its inside is the Trainer Tower's lobby, cloned at load in `ui/game.js`). With the
Rainbow Pass, Vermilion's Seagallop sailor offers **Stadium Island** (Seagallop Hi-Speed 8)
beside the Sevii Islands; the island's own sailor takes you home. In the lobby the
receptionist runs the **Cups**, the clerk the **Gym Leader Castle**, the nurse heals, and the
sign is the Hall of Trophies.

- **The Cups** (Pokémon Stadium's rules, `window.STADIUM` in data/trainer-tower.js,
  `Stadium` in game/trainer-tower.js): the **Pika Cup** (Lv. 15-20, 50 in all, only Pokémon
  that can still evolve), the **Petit Cup** (Lv. 25-30, 80 in all, under 2 m and 20 kg), the
  **Poké Cup** (Lv. 50-55, 155 in all, no Legendaries) and the **Prime Cup** (Lv. 100,
  anything). Choose three, no two of a species; they're set to the level the rules allow, as
  copies (yours aren't touched; a save made mid-Cup puts yours back on loading), and you
  face eight Trainers in a row, three Pokémon each from random sets, better IVs each round;
  your three are healed between rounds and you may stop. Win all eight for the Cup's
  prizes (items from the Trainer Tower's pools), Battle Points (4, 6, 8 and 12) and its place
  on the Hall of Trophies.
- **The Gym Leader Castle**: Round 1 is Kanto's eight Gym Leaders, Brock to Giovanni, three
  Pokémon each (this game's picks) at your best's level (at least 30), your three as they
  are; once it's won, Round 2 is the Elite Four and the Champion, 3 levels higher. Prizes:
  items, Battle Points (10, 15) and, the first time, a Master Ball for Round 2.

Not built from Pokémon Stadium: its rental Pokémon, the Kids Club's mini-games and the
Free Battle.

## Hoenn

Hoenn is imported from pret/pokeemerald with Emerald's own tilesets and scripts. Generators, all
taking the pokeemerald checkout as their argument and all safe to run again:

- `tools/build-hoenn.js` (`node tools/build-hoenn.js <pokeemerald> [--list] [--only=A,B --out=dir]`)
  reads each map's layout, metatiles, objects, warps, triggers, trainers, marts and wild tables,
  draws the pictures (`tools/lib/emerald-tiles.js`), writes the NPC and trainer sprites
  (`em_*.png`), the metatile overlay sheets for maps whose scenery changes (`<Map>-mt.png`), the
  compiled scripts (`window.HOENN_SCRIPTS`) and the Town Map, and puts it all in
  `data/emerald-maps.js` between the `Hoenn` markers.
- `tools/build-hoenn-audio.js` renders Emerald's songs and jingles with the same M4A engine as
  the rest (`assets/audio/hoenn-music.js`, songs named `em_*`; in Hoenn `mus_x` plays `em_x`).
- `tools/build-hoenn-items.js` adds Emerald's key items and mails.
- `tools/build-rayquaza-scene.js` draws the Sootopolis scene's backgrounds and sprites (`graphics/rayquaza_scene/`)
  into `assets/rayquaza-scene/`.
- `tools/build-emerald-credits.js` draws the credits' rides, riders, scenery and THE END
  (`graphics/intro/scene_2/`, `graphics/credits/`, `graphics/starter_choose/`) into `assets/credits/emerald/`.
- `tools/lib/hoenn-town-map.js` draws Emerald's Town Map; Fly lands outside each town's Center.

Emerald's event scripts (`tools/lib/emerald-script.js`) are compiled to JSON and run by an
interpreter, `ui/hoenn-script.js`: the moving truck, Birch and the starter bag, Wally, the rivals,
step triggers and frame tables, flags and vars (saved in `player.flags.hoenn`), movements, shops,
item balls, trainers, the gym puzzles of Petalburg and Mauville. Pokémon Centers, Marts, Cut,
Rock Smash, Strength, item balls and trainers on sight keep the game's own handling.

Get there from Vermilion's Seagallop ("Hoenn", once Celio's machine is done) or, once you've
beaten Johto's League, Olivine's S.S. Aqua with the **Hoenn Ticket** (Oak gives it in the Hall of Fame as you're
crowned Johto's Champion; a save past that gets it from the ship's clerk). Your first visit
starts in the truck; later ones land at Slateport's harbour, whose sailor takes you home. You come
as Johto's Champion (`ui/hoenn-changes.js`, this game's changes to Emerald's story, made as the page
loads): you hop down from the truck (it's solid, three tiles by three, and the Pokémon walking with you
hops down too), with no Mom to take you in (she's Brendan's; nor, later, to give you Running Shoes) and no May at home to meet, and no twin
stops you going north: straight up Route 101, Prof. Birch is chased by a Zigzagoon and calls for help.
Whichever Pokémon you take from his Bag fights the Poochyena (with your party full, it joins you for
the battle and then goes to the PC), and Birch knows you, the Champion of Johto, and gives it to you.
Oldale's Mart clerk, once she's walked you to the Mart with the Potion, stays there. Norman is
Petalburg's Gym Leader, not your dad, and knows you as Johto's Champion; Wally walks into his Gym, and
on the way to Route 102's grass you walk right behind him. His catching lesson is Emerald's battle: Wally
from behind with Norman's Zigzagoon (Lv. 7, Tackle) against a wild Ralts, playing itself (FIGHT, Tackle,
then BAG and a Poké Ball that always catches: `ui/battle-screen.js` `wallyLoop`). A person a script
removes stays gone (Emerald's removeobject sets their flag: May leaves Route 103 for good once beaten),
and every trainer with a script to go on to after the battle (Calvin's and the like) sees you too;
trainers who spot you walk over and then say what their own script says. Trainers who see all round look every way, and those buried in sand (Lavaridge's Gym, Route 113's Lao) stay out of sight until you step beside them, then burst out. Hoenn's
badges unlock Cut, Flash, Rock Smash, Strength, Surf, Fly, Dive and Waterfall; whiting out sends
you to the last Center or your bedroom.

Also in: Dive (A on deep water, with the Mind Badge; Underwater maps with Emerald's diving sprite and
seaweed encounters), the move tutors, the Move Deleter and Relearner, in-game trades, the legendary and
Regi battles, the Mt. Chimney cable car and the Hall of Fame (the team on record, then Emerald's credits, then home).

Emerald's credits (`ui/hall-of-fame.js`, pictures from `tools/build-emerald-credits.js` into
`assets/credits/emerald/`): you bike through Hoenn as the 57 pages roll (16 apart, titles in yellow,
a page every 147 frames as Task_UpdatePage times it), along the sea by morning and at sunset,
through the forest at sunset, where your rival overtakes you and then you catch them up, and
through town at night with its windows blinking, the scenery drifting past at Emerald's speeds and
the ground bobbing under you; between the rides, on Prof. Birch's grass, 71 slides of the Pokémon
you caught (a random order, your starter last, each sliding out onto its coloured square); then
you both ride off, the long dark, and THE END, drawn from its letter tiles. Start or B skips it.

Also: berry trees (Hoenn's own growth stages and mulch; picked as the Berry Farm's are, straight into the Bag, for
farming XP, and the Berry Pouch works in Petalburg Woods: the farming level counts there too), weather, your own secret base with its decorations,
the volcanic ash on Route 113's and Jagged Pass's grass (walk through it and it falls off till you come back; with
the Soot Sack it's gathered, for the Glass Workshop's flutes and glass furniture at Emerald's prices),
the braille (shown in Braille's dots) and the Regis' puzzles as `src/braille_puzzles.c` has them: Dig under the
Sealed Chamber's DIG HERE (Dig is a field move, for a Pokémon that knows it: out of a cave too, as an Escape Rope),
Wailord first and Relicanth last at its back wall, then Rock Smash in the Desert Ruins, Flash in the Ancient Tomb and a
lap of Island Cave's wall,
no wild Pokémon on a beach's sand or Mt. Chimney's top (only where Emerald has them: grass, deep sand, caves, ash,
water), the cracked floors of Granite Cave, Sky Pillar and the Mirage Tower (they give way under you, down to the floor below,
unless the Bicycle's going flat out: then they give way behind you, holes till you come back),
Feebas (six of Route 119's fishing spots, your own six by your Trainer ID, where half the bites are Feebas, Lv. 20 to 25),
Shoal Cave's tides (high from 9:00 to 14:59 and from 21:00 to 2:59 by the game's clock, low between, as you come in from outside),
Prof. Birch's Pokédex rating (on the Hoenn Pokédex, Emerald's order of 202, then nationwide) and the Game Designer's diploma,
after the Hall of Fame Norman's S.S. Ticket and the news flash at his family's house (your room in Littleroot is his
family's: Brendan's house, or May's for a girl), and the Pokémon it tells of roaming Hoenn's routes till caught (Latias for
red, Latios for blue, Lv. 40, one wild Pokémon in 16),
Mr. Stone making your Pokégear a **PokéNav** in Devon's office (from then on it's the PokéNav in the start
menu and everyone's words, in blue, doing all the Pokégear did with everyone you'd registered still in it, and Johto's
trainers who'd register now register in the PokéNav),
the S.S. Tidal (its sailings from Lilycove, by the tickets you hold, and the voyage on as you walk the ship, or rest;
after the Hall of Fame Norman brings a Sinnoh Ticket too, this game's own, and Lilycove lists a run to Sinnoh, which
isn't sailing yet: Sinnoh's to come),
the rotating-tile puzzles, the Mirage Tower and Rayquaza's scenes. The scene over Sootopolis is Emerald's own
(`ui/rayquaza-scene.js`, its pictures from `tools/build-rayquaza-scene.js` into `assets/rayquaza-scene/`), its
five scenes timed as `src/rayquaza_scene.c` times them: Groudon and Kyogre facing one another under the storm
(the clouds streaming by in bands, the rain, the lightning's flash), over Rayquaza's shoulder as it takes flight
through the smoke, its descent through the clouds in a ray of light revealed line by line, the charge with the
streaks and orbs flying past, and Rayquaza floating over the pair, roaring (the rings of its voice), as Groudon
backs off and Kyogre sinks away; before Rayquaza's awakening, the shorter telling of the fight alone.

Other people's secret bases (this game's own, since Emerald only has them through record mixing; `hoennNpcBases` in
`ui/game.js`): a dozen of Hoenn's spots are taken, each by an owner of one of Emerald's ten kinds (its
`sSecretBaseOwnerGfxIds` and `sSecretBaseFacilityClasses`: five boys, five girls), named after one of the Frontier's
trainers, with decorations set out where Emerald's placement rules let them go (`ui/hoenn-decor.js` `furnish`) and a
party of the Frontier's Pokémon at the level you were when you first came to a spot, raised to your party's level
each time you battle them. They're made once from your trainer ID and kept. Go in and the owner talks and battles as Emerald's record-mixed owners do (its
`SecretBase_EventScript_RecordMixTrainer`: once a day, after the Hall of Fame, their class's picture, Emerald's words
for the loss, no money and no blacking out), and their PC registers the base, as Emerald's registry does.

**The Battle Frontier** runs Emerald's own lobby and battle-room scripts over `ui/hoenn-frontier.js` (the commands those
scripts use), with its trainers, Pokémon, Battle Point prizes and the Brains read from the decomp's tables by
`tools/lib/hoenn-frontier.js`. The challenge fights with copies of the Pokémon you register (set to Lv. 50, or your
own level in Open Level mode); your real party is never touched. Built: the Battle Tower (singles, doubles, and multis with
a partner), Factory (its rental screen, six to choose three from with a Summary of each, and its swap screen after a
win: `ui/hoenn-frontier-screens.js`), Arena (three-turn bouts, no switching, and the
referee's judgment on Mind, Skill and Body when both still stand, Emerald's points: `engine/battle.js` `arenaJudge`, the
judgment window on the battle screen; the Verdanturf tent judges too), Palace (each Pokémon picks its own move by
its nature's odds, Emerald's tables, or can't bring itself to; the Fallarbor tent too), Dome (a 16-trainer tourney, its tree
drawn as Emerald lays it out, the winners' lines marked and each trainer's Pokémon under it), Pike
(doors, hints, statuses, healing rooms and the hall of wild Pokémon), the Slateport, Verdanturf and Fallarbor tents, the
Battle Pyramid, the Brains' Silver and Gold Symbols, Battle Points and the exchange shops. The Pyramid builds each of its
seven dark floors from the decomp's squares and templates (`ui/hoenn-pyramid.js`), with your party and a two-item
Pyramid bag swapped in until you leave; RETIRE on its Start menu gives the challenge up (Emerald's own), and conquering
it brings a prize with the Battle Points (Emerald picks one, a vitamin, or past a streak of 41 a held item of worth,
but its scripts never hand it over; this game does). Challenges are saved and resumed through the game's own save; for the bots that
play-test them, `HOENN_FORCE_WIN = "won"` or `"lost"` (with `HOENN_DEBUG`) settles each battle at once.

Recorded battles, as Emerald keeps them: every Frontier battle is recorded as it's fought (the engine's seed and
each side's choices, `ui/battle-screen.js`), the lobby attendant offers to save the last one on your Frontier Pass
(`frontier_savebattle`: one record, the newest), and the Pass, which takes your name's place on the Start menu once
Scott's gate has issued it, shows your Battle Points, Symbols and Trainer Card and plays the recorded battle back:
the same battle from the same seed, choice for choice.

**Contests** at Lilycove run the contest halls' scripts over a simplified engine (`ui/hoenn-contest.js`: the 95 contestants,
353 moves, appeal and jam, five rounds, and the ribbons). A Pokémon's conditions are a little from its stats and what
the **Pokéblocks** it's eaten gave it (`ui/hoenn-pokeblock.js`: Emerald's arithmetic, spicy for Cool, dry for Beauty,
sweet for Cute, bitter for Smart, sour for Tough, the feel for sheen, and its nature deciding whether it ate happily or
disdainfully; the Pokéblock Case, a key item used from the Bag, holds forty). They're made at the Contest Lobby's
**Berry Blenders** with Mister, Laddie, Lassie or the Blend Master (`ui/berry-blender.js`: the arrow spins round the
blender, A as it crosses your mark, BEST, GOOD or MISS speeding it up or slowing it, the others pressing by Emerald's
odds; the best speed reached and the berries put in, theirs by Emerald's sets, make the block, its colour and level as
Emerald works them out); Lilycove's Pokémon Center lady takes one for her Pokémon. (Emerald's Contests have no dressing
room; that's a later generation's.)

The Apprentice (`ui/hoenn-frontier.js`, Emerald's `src/apprentice.c` through its own scripts): a young trainer
in the Tower's lobby, one of sixteen, asks you to teach them. You pick their level mode, then a day at a time one
Pokémon from each of three pairs (their ten shuffled), and then, in Emerald's shuffled order, which of two moves
a Pokémon should know (its latest, or another it can learn, a TM's or an earlier one), what each should hold
(from your Bag; an item suggested twice is refused, since Tower Pokémon may not hold the same one), which should
lead, and at the last what they'll say on winning (one of eight speeches, in place of the Easy Chat screen).
Each answer sends them off till the next day; the win speech ends the lessons, wherever it landed, and they're
saved (four at most, numbered) to meet you in the Tower's singles at the streak their lessons earned
(`sApprenticeChallengeThreshold`), with the Pokémon, moves and items you chose, full IVs and even EVs, and
their challenge, win speech and loss as Emerald's. Then a new Apprentice waits.

Not built: the e-Reader and Link and wireless features (hardware; the Record Corner, Union Room, mixing records
and the Battle Tower's link modes have no counterpart here) and the fan club.

**The Safari Zone** (Route 121's) is Emerald's own: its six areas and rest house (`HoennSafariZone_*`, named apart
from Kanto's), its gate's scripts (₽500 and the Pokéblock Case to go in, 30 Safari Balls, 500 steps), its battles
with BALL, POKéBLOCK (one from the case, which the Pokémon is curious about, enthralled by or ignores, by its
nature, and flees the less for it: Emerald's sPkblToEscapeFactor) and GO NEAR (easier to catch, likelier to flee:
`engine/safari.js`), RETIRE on the Start menu, and its Pokéblock feeders: a block put on one draws Pokémon that
like it for 100 steps and five tiles round (`hoennSafari` in `ui/game.js`).

The smoke test runs a story scene (Norman and Wally) through the interpreter with a stub game; `HOENN_TRACE = []`
in the console logs every command a script runs.

## The Delta Episode and Jirachi (Hoenn's post-game, this game's own)

After Omega Ruby and Alpha Sapphire's Delta Episode, told in Emerald's Hoenn. Once you've been through Hoenn's
Hall of Fame (which now sets Emerald's `FLAG_SYS_GAME_CLEAR`, as Emerald's `GameClear` does, so its post-game
scripts work too):

1. **Mossdeep's Space Center**, as you come in: its director and Steven tell you a huge meteoroid is falling on
   Hoenn, and Zinnia, the Draconids' lorekeeper, walks in and battles you (Tyrunt, Shelgon, Altaria and a Salamence
   that Mega Evolves, Lv. 62-65), then sends you to Meteor Falls.
2. **Meteor Falls**: a Draconid elder tells the old story (a star that fell, and Rayquaza, the sky's protector,
   breaking it apart) and sends you up the Sky Pillar.
3. **The Sky Pillar's top**: Zinnia again (Tyrantrum, Noivern, Goodra, Altaria and her ace, Mega Salamence,
   Terastallizing, Lv. 70-74); then Rayquaza answers her call (your own, if you have one; caught or not, Emerald's
   stays where it was) and carries you up: Emerald's Sootopolis scene's flight, Rayquaza taking off and charging
   (`ui/rayquaza-scene.js`, mode 2), into the meteoroid, where **Deoxys** waits, wild at Lv. 80 over the
   meteoroid's rock among the stars (`assets/battle/space.png`). The meteoroid breaks apart into shooting stars
   and you're back at the Space Center, thanked.
4. **Jirachi**: 2F's researcher has found a strange energy signature in the sealed observation room, its door in
   2F's window wall (a red light; green once he's unsealed it). Inside, a small observation deck: a wide window
   on the night sky and a white rock in the middle. Check the rock and make a wish (only words); it glows, the
   stars outside draw into a line, and Jirachi appears: "A wish only holds power if the one who makes it is strong
   enough to protect it." A wild Jirachi, Lv. 50; caught or beaten it's gone for good (run from it, and it comes
   again for another wish). Back on 2F, the researcher sees the readings settle, and the instruments glitch as if
   they'd recorded something impossible.

Emerald has no Zinnia: her trainer picture and overworld sheet are its Hex Maniac's, recoloured (black hair, a
dark green robe, no hat). `node tools/build-delta-episode.js` draws them, the space background (FireRed's cave
background's platforms as meteoroid rock over stars), the observation deck from the Space Center's own tiles (its
window, the rock, and the glow and the stars in line as patches) and 2F's door, and writes the deck's map and the
door into `data/emerald-maps.js` between its markers. The story's in `ui/game.js` (`player.flags.delta`, 0-4;
`jirachiMet`, `jirachiAfter`).

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
node tools/build-berry-farm.js <path to pret/pokeemerald>   # Celadon's Berry Farm, at the end of the same file
```

The shore has the island's faded sign and the Seagallop's sailor to take you
home. Inside, in the long grass, Mew plays hide and seek as in Emerald
(`src/faraway_island.c`, here `game/faraway.js`): it spots you as you come in,
darts into the grass and vanishes; each step you take it takes one too, away
from you if it can (and never trapped between you and one of the four
rocks), shows itself only every 8th step and pauses on the 9th, and walking
up to it, seen or not, finds it: "Myuu…", and a wild Mew, Lv. 50 (Emerald's is Lv. 30), knowing
Psychic, Nasty Plot, Aura Sphere and Ice Beam (this game's own). Caught or
beaten it's gone for good; run from, it flies away and is back the next
time you come in. Like Emerald's, the island is no place to Fly from.

## Other regions in FireRed's style

Every region is to look like Kanto, whatever game its maps come from (most
later games' maps are 3D). So a region's maps are built in two halves: its
**layout** from its own game (where you can walk, water, tall grass, ledges,
doors, warps, people, signs, wild Pokémon), and its **pictures** painted
with FireRed's own metatiles by one painter, `tools/lib/fr-painter.js`:

- `tools/build-fr-style.js <pret/pokefirered>` learns FireRed's style from
  Kanto's own maps into `tools/data/fr-style.json`. Each metatile of the
  General tileset gets a class (grass, flowers, path, sand, pavement, bridge,
  tall grass, water, water rock, tree, rock, fence, ledges facing each way,
  building, object), and every tile of Kanto's towns, cities, routes and
  islands is counted under its pattern: its class, its eight neighbours'
  classes and whether its column and row are odd (trees and grass repeat in
  2x2 blocks). It also keeps a library of Kanto's buildings, picked out by
  hand: Pokémon Centers, Marts, Gyms, houses of several sizes, Oak's Lab,
  big buildings, towers and a gate, each with its door; and FireRed's signs.
  A stamp is used as it is only where it covers a building's footprint well
  (`minScore`, and 80% of the footprint); otherwise the painter stretches one
  to the footprint, nine-slice fashion (the columns beside its door and the
  rows above it repeated or dropped, its door on the building's; a side with
  nothing to repeat is left bare, not doubled), the roof rising above the solid
  part as HGSS's do. `noFill` leaves door-less leftovers alone.
  It learns two styles: outdoor (from Kanto's towns, cities, routes and
  islands) and cave (from the maps drawn with the Cave tileset); a class a
  style lacks (water in a cave) is drawn as outdoors, and waterfalls are
  FireRed's waterfall column (top, middle, foot).
- A region's builder says what each of its tiles is, in those classes, and
  where its buildings and their doors are. The painter gives each tile the
  metatile Kanto uses in the closest pattern (so shores, path edges, cliff
  faces and tree lines come out as Kanto draws them), stamps a Kanto building
  of the right kind on each door (the one that best covers the building's
  footprint, its door on the door), fills door-less city blocks with Kanto's
  houses and plain buildings (never a Pokémon Center, Mart or Gym where there's
  none), puts trees on what's left, and draws FireRed's signs, bushes and
  flowers. The water and flowers animate as Kanto's do.

The look is the painter's and the tileset's alone, so changing either
changes every region at once, and a new region needs only its builder (and,
for its landmarks, new buildings in the library). `tools/build-maps.js`
(Kanto) and the painter share `tools/lib/fr-tiles.js` (FireRed's tilesets
and drawing metatiles).

## Johto (in progress)

**Johto's maps are Pokémon Heart & Soul's**
([PokemonHnS-Development/pokemonHnS](https://github.com/PokemonHnS-Development/pokemonHnS), a GBA
remake of Johto on the Emerald decomp: its hand-drawn GBA maps and tilesets, with thanks to its team),
and everything on them is still HGSS's: its scripts, people, trainers, signs, items, doors and
triggers, moved onto Heart & Soul's ground. `tools/build-johto.js <pret/pokeheartgold>
--hns=<pokemonHnS checkout>` builds HGSS's maps as below and then, for each one paired with a
Heart & Soul map in `tools/data/hns-johto-maps.json`, draws Heart & Soul's instead
(`tools/lib/hns-johto.js`, through `tools/lib/emerald-tiles.js` with its wider primary tileset and
its own sand, flower and waterfall animations) and moves HGSS's events onto it
(`tools/lib/hns-johto-port.js`): HGSS's tiles map onto Heart & Soul's by a fit through the doors,
people, signs and hidden items both have (an affine fit, bent to each anchor), each door matched to
Heart & Soul's own nearest of the same kind, each person onto the nearest of Heart & Soul's people
or else the nearest tile you can reach, each step trigger stretched across the way it blocks.
The same fit runs in the game (`ui/johto-coords.js`, `window.JOHTO_COORDS`): a script's warp,
coordinates and the walks it sends people and you on (each run of steps followed in HGSS's tiles
and walked the shortest way to where it ends) are HGSS's, taken onto the map as it is. A save from
before is moved onto the new maps as it loads. Where Heart & Soul's places differ: Lyra's upstairs
is on her house's floor, Bell Tower's top two floors are one, Mahogany's Gym is one room, Azalea's
Gym takes in its entrance, Slowpoke Well's B1F its entrance, the Lighthouse's 1F its lift and its
3F the balcony outside, the Magnet Train stations' platforms are on their 1F, Violet's gate to
Route 36 is gone (Route 36 runs straight in), and so is Kirk's house in Cianwood; Whirl Islands' inner B1F and the way down, Ice Path's
B4F and the Department Store's 7F are Heart & Soul's own, new here. Heart & Soul doesn't have
the Pokéathlon Dome, the Battle Frontier and its access, the Sinjoh Ruins, the Embedded Tower,
the Global Terminal, the Radio Tower's lift and observation deck, the Ruins of Alph's hall or the
Safari Zone's grounds (whose Areas are HGSS's), so those keep HGSS's maps. On Heart & Soul's maps
there are no Rock Climb walls (its rock stairs you walk up), and its Gyms are its own puzzles:
HGSS's lift, dark, winch and ice blocks (below) are off there. Goldenrod Underground's switch room is
Heart & Soul's too: its three panels open and shut its six walls (3, then 2, then 1 opens the way to the
warehouse, for good), in place of HGSS's gates; its walls are Gen 3's one-way edges (`MB_IMPASSABLE_*`,
which `game/world.js` keeps everywhere), and the table's `patches` draw them open. A pair of trainers
(Azalea's Gym's twins, Route 37's) says HGSS's double-battle lines, each her own after, and stands together.
The Burned Tower's 1F has none of the three dogs HGSS shows down through its broken floor (you meet them in
the basement), the Lighthouse has no doors on plain floor (the table's `dropWarps`, and the doors that led only to them), items HGSS put where Heart & Soul's ground is trees or rock all round are at the nearest spot you can reach (a hidden Rare Candy in Olivine's woods, the Bell Tower's 4F Poké Ball), and the Ruins of Alph's Hall door is Heart & Soul's, straight down to the Underground Hall (HGSS's doors to its entrance hall, put in the rock either side of it and beside Psychic Nathan, are gone; the entrance hall's own door leads out of that one: `tools/lib/johto-changes.js`). Its Apricorn trees stand on Heart & Soul's own trees (drawn by the map, with no sprite of HGSS's
over them), HGSS's Cut trees, rocks and boulders only where Heart & Soul has its own (and Heart &
Soul's own besides: Ilex Forest's Cut tree, so Bugsy comes first, as in HGSS), the nurse and clerks behind its
counters, the Bug-Catching Contest's officers behind the National Park gates' counters, Pokémon by the same Pokémon (Sudowoodo in its
place), and no one stands in a way through the map that wasn't in the way in HGSS's (Route 30's
youngsters step aside; Sudowoodo still blocks Route 36). A person matches only Heart & Soul's people of the
same look (HGSS's and Heart & Soul's names for a look are one: a Mart clerk is a clerk), and the one-of-a-kind
(the Gym guide, the nurse, the clerks, Silver, the Elder, the Gym Leaders, Prof. Elm...) never take someone
else's place; those left over stand where HGSS's neighbours put them, beside whoever they stood beside. A step
trigger on one tile takes Heart & Soul's own triggers for that scene nearby (Sprout Tower's Silver scene);
`place` in `tools/data/hns-johto-maps.json` sets where someone stands by hand (Azalea's Rocket and the man he
shoves; Slowpoke Well's Kurt by its ladder, and the Kurt of HGSS's B1F out of sight until his scene, the well's
entrance being part of B1F here). Signs go onto Heart & Soul's signposts: the nearest, then by what they say
(its `AzaleaTown_EventScript_KurtSign` is the sign that names Kurt), then the nearest left (indoors within five
tiles); a sign with words that's still nowhere you could check it from (a sink on the wall's top row) moves to
the nearest tile you can. Route 36 doesn't join the Ruins of Alph's map below it (nobody can cross there, and
the Ruins' darker trees showed past the edge). In a
scene your walking Pokémon walks too (`obj_partner_poke`): in Ilex Forest it goes over to the Kimono Girl and
helps her, the shortest way round to her side, then comes back behind you. Someone a scene walks onto the tile your
Pokémon stands on (Wally into Norman's Gym) finds it back at your feet, till you walk on. After the Radio Tower, Goldenrod
Tunnel's Kimono Girl waits in Heart & Soul's corridor and meets you at its foot, up from the stairs (HGSS's room and step
are in its walls). HGSS's Wi-Fi and Mystery Gift staff aren't there. Coming through a door into a scene (the Kimono
Girl outside Violet's Mart), you step out of the doorway first; someone a script walks to a door walks onto
Heart & Soul's door (Elm's aide out of the Mart). In the Ruins of Alph's chambers Heart & Soul's table is the
panel: examine it from the front; each chamber's stone stands in its secret room's door until its riddle's
solved (a door with someone in it doesn't open: `game/world.js`). Where Heart & Soul's ground is too unlike HGSS's for its walks, `sceneMoves` in
`tools/data/hns-johto-maps.json` walks a scene its own way (by who and HGSS's movement label; `to:x,y` the shortest
way there, `to:player` to beside you, facing you, `face:<who>` turned to them, `at:x,y` there at once, `@x>=14`
for one part of the map): Kurt's granddaughter comes over to you with his number; on Route 34 Lyra walks up to her grandpa
and takes you into the Day-Care by Heart & Soul's side door, where she introduces you to her grandma across the
counter, and coming out the Day-Care Man walks over and gives you his number and his wife's; in Goldenrod's
Underground Lyra comes up the stairs of whichever entrance room you came in by. Route 34's Day-Care couple
run this game's two-Pokémon Day-Care (Four Island's, with its Eggs, but their own: `player.flags.johtoDayCare`),
the Pokégear's Day-Care calls about theirs. Cameron the photographer isn't in this game, and the Bug-Catching
Contest's ten contestants are in the National Park only when the judging lines them up. Route 35's Juggler
Irwin battles with his strongest Voltorb (Electrode, later), Mr. Mime, Drowzee (Hypno) and Magnemite (Magneton).
Everyone in Johto has HGSS's own sprite (`hgss_*`); you can't ride the
Bicycle in Johto's buildings (its Pokémon Centers included), as in Kanto.
Johto's wild Pokémon are HeartGold's and SoulSilver's: a slot where they differ is either, as likely
(Skarmory, Teddiursa, Ledyba...), with this game's changes for a smoother level curve (`WILD_CHANGES` in
`tools/build-johto.js`): the Ruins of Alph's Natu and Smeargle are Lv. 7-11 (HGSS's 18-24, reached
right after Violet City), and three Pokémon HGSS keeps off Johto's routes are on them: Houndour
on Route 37 (Lv. 14, 10%), Slugma on Route 42 (Lv. 16, 10%) and Larvitar on Route 45
(Lv. 20, 5%). Raikou and Entei roam Johto after the Burned Tower (HGSS's
CreateRoamer): 1 in 16 wild battles in its grass outdoors, Lv. 40, until caught. New Bark Town's Pokémon Center (below) is Heart & Soul's Cherrygrove Center, drawn into the town's map south of Elm's lab. Without `--hns` the build draws
every map from HGSS as below. None of Heart & Soul's or HGSS's source is in this repository; the
built pictures and data are.

Johto's maps are built from HeartGold and SoulSilver: all of them, every
town, city, route, cave, tower, Gym, house, shop and room of HGSS's Johto
(and the houses by Routes 26 and 27, Tohjo Falls' hidden room, Route 28 to
Mt. Silver and Goldenrod's Game Corner, which HGSS counts as Kanto's). Not
built: the unused maps, the Wi-Fi rooms (and the Pokémon Centers' Wi-Fi
basements) and the Battle Frontier's halls, which need games of their own;
their doors say so. (The Safari Zone is built, Areas and all: below.) New Bark Town, Route 29 and
Cherrygrove City; north and west to Violet, Azalea, Goldenrod, Ecruteak,
Olivine, Cianwood, Mahogany and Blackthorn, the Lake of Rage, Mt. Silver and
the routes, gatehouses, caves and towers between them; and the way to Kanto:
**Route 27** (by sea east from New Bark Town), **Tohjo Falls** (the cave in
its middle: Surf, and Waterfall up one of its falls and down the other, as in
HGSS) and **Route 26**, north to the Pokémon League Reception Gate. Coming
the other way, from Kanto, Route 27's man by the water (HGSS's "You've taken
your first step into Kanto") tells you instead that Pokémon raised in Kanto
won't listen to you in Johto at first, and to see the Rejuvenator upstairs in
New Bark Town's Pokémon Center; and its Ace Trainer Reena asks "You came from
Pallet Town? You must be exhausted." **New Bark Town has a Pokémon Center**,
this game's own (HGSS's has none; Mom heals you there, and this game's Mom is
in Pallet Town): Cherrygrove City's building, on the open ground south of
Elm's lab (HGSS's own picture of it, its building alone, cut from
Cherrygrove by `tools/build-new-bark-center.js <checkout>`: the map's patch
`pokecenter`, always on, by the town's sign), and Cherrygrove's two
floors cloned with their own names (`NewBarkTown_PokemonCenter_1F` and `_2F`,
drawn with Cherrygrove's pictures; its nurse, the gentleman by the PC, and
upstairs the Move Relearner, Move Deleter and Rejuvenator), built by
`tools/build-new-bark-center.js` into the end of `data/johto-maps.js`. Fly
to New Bark Town lands in front of it, as in every other town. That gate
is FireRed's own (Route 22's, to Victory Road), with a new way out west: a mat
at its left wall to Route 26's door. A guard stands in front of it until
you're the Champion: "The Johto region lies to the west." / "I'm sorry, but only the
Champion of the Pokémon League may go on to Johto." Become Champion and he's
gone. (The debug menu's **Visit Johto (New Bark Town)** still takes you
there, and its Pokémon Center trip brings you back.) Without `--hns`, Johto's maps are drawn
as HGSS draws them, seen from above: its towns, routes, caves, rooms,
gatehouses, Pokémon Centers and Marts are HGSS's own 3D maps rasterised
(below), buildings, textures and all. (They were first painted in FireRed's
style from what each tile is, with Kanto's buildings stamped on by their
doors, `tools/lib/fr-painter.js` and `hgss-classes.js`; `--painted` still
draws them that way, and `tools/build-fr-style.js` learns the painter's
patterns from Kanto. It looked poor beside HGSS's own art, so HGSS's is the
look now. `--hybrid`, a trial, paints the ground in FireRed's style the same
way, with full forests and no Kanto buildings, and stands every one of HGSS's
own buildings on it redrawn as GBA pixel art: a few colours each, snapped to
the GBA's 15-bit colour, with a dark outline.) `tools/build-johto-crystal.js`,
another trial, draws Johto's maps from Pokémon Crystal's own instead
([pret/pokecrystal](https://github.com/pret/pokecrystal)): its flat grids of
blocks, each step's square told apart by its collision and its tiles' palettes
(grass, paths, trees, cliffs, fences, water, ledges, the pier, cave mouths,
buildings), painted in FireRed's style with a building of Kanto's at each door,
of the kind the door leads to. It writes only pictures
(`node tools/build-johto-crystal.js <checkout> --only=Map,Map --out=<dir>`):
Crystal's layouts differ from HGSS's, so the game's maps still come from HGSS. A third,
`tools/build-johto-hns.js`, draws them from
[Pokémon Heart & Soul](https://github.com/PokemonHnS-Development/pokemonHnS), a GBA remake
of Johto on the Emerald decomp, with its own hand-drawn GBA maps and tilesets
(`node tools/build-johto-hns.js <checkout> <out dir> NewBarkTown VioletCity ...`),
through `tools/lib/emerald-tiles.js` with Heart & Soul's wider primary tileset.
It writes only pictures too, and none of Heart & Soul's art is in this repository. In HGSS's Pokémon Centers the nurse stands behind HGSS's counter
and heals as Kanto's nurses do; the Wi-Fi and Union Room staff (this game has
neither) aren't there, and the stairs down to HGSS's Wi-Fi floor go up
instead, to FireRed's Pokémon Center 2F with its Move Relearner, Move Deleter,
Tradeback Guy and Rejuvenator, as in Kanto. `node tools/build-johto.js
<checkout> --only=Map,Map --out=<dir>` draws just those maps' pictures, in
seconds, to look at. An Escape Rope works in its caves, Ilex Forest and its
towers and dungeons.
Johto's people are all drawn with HGSS's own sprites (`assets/world/sprites/hgss_*.png`, in FireRed's
frame order), scaled to Kanto's people's size as they're written (HGSS's
stand about 23 px tall, Kanto's 20: `scalePersonSheet` in
`tools/build-johto.js`, box-filtered and snapped back to the sheet's own
colours); its item balls, small trees and breakable rocks are FireRed's.
HGSS's maps are 3D, so
`tools/build-johto.js` (with `tools/lib/hgss-map.js`, `nitro.js` and
`narc.js`) reads them and draws them the way HGSS shows them seen from
above, from a
[pret/pokeheartgold](https://github.com/pret/pokeheartgold) checkout:

```sh
node tools/build-johto.js <path to pret/pokeheartgold>
# (what this game changes in Johto's story and maps, applied as it writes:
# tools/lib/johto-changes.js, so a rebuild keeps them)
```

It reads the map headers and the overworld matrix (or a cave's, forest's or
room's own, as Tohjo Falls', Ilex Forest's and the gatehouses'), each 32x32-tile chunk's
land data (tile permissions, building placements and its NSBMD terrain
model) and the area's textures, and rasterises the terrain and buildings in
software at 16 px a tile: house fronts and tree trunks drawn upward from
their tiles, as in FireRed, and what stands in front of you (tree tops,
roofs) in the map's `-top` layer. Johto's first three maps are flat; the rest
climb, so they're drawn from each tile's ground: the
height the game stands you at there (each chunk's BDHC, its flat and sloping
"plates"), on a tile you can walk or Surf on, and a solid tile takes its
neighbour's. Raised ground stays on its tiles; the land's corners stand on
the highest ground around them that isn't above them; a tree or house rises
whole from the ground at its foot, and a waterfall, between two grounds, is
drawn from the ground under each corner. Hidden land (the sea under a
mountain, which would show between its terraces) is left out, and any gap
left takes its neighbours' colour. In front of you go trees, roofs, rocks and
walls, but never water or what stands on a tile you walk or Surf on, so you
pass behind Tohjo Falls' rocks and walls and climb its falls in view. A
chunk of a neighbouring map, drawn round a map's edge, uses that map's own
textures; land lit by the DS (normals, not vertex colours) is drawn fully
lit; in a room or cave, a tile with nothing drawn on it is solid; and HGSS's
cave stairs become warps you step onto. HGSS's waterfalls are solid, and become
FireRed's, which Waterfall takes you up (or down); the maps' joins come from
where they sit on the matrix. The tiles' permissions become collision and
FireRed's behaviours (tall grass, water, ledges, doors), and from the event
data come the signs ("New Bark Town / Winds of a New Beginning"), hidden
items, and everyone on the maps (people, trainers, item balls, small trees,
breakable rocks, Apricorn trees). HGSS's ladders, stairs, escalators and
cave exits become FireRed's (a way down you walk onto in the middle of a cave,
as the Whirl Islands', a warp you step onto), and its elevators' doors open
where you got in (FireRed's dynamic warp), or on the floor you choose.
**Whirlpools and rocky walls** are HGSS's: a whirlpool (Routes 27 and 41,
the Whirl Islands, Dragon's Den; drawn as a swirl of foam turning with the
water) stops you surfing, and A in front of it ("It's a huge swirl of water.
Would you like to use Whirlpool?") takes you through it to the water beyond;
a rocky wall (Mt. Silver, Mt. Mortar, Routes 46 and 47 and the like, footholds
up its face) is in your way on foot until Rock Climb takes you up, down or
along it, the way it goes ("The wall is very rocky… Would you like to use
Rock Climb?"). Both are field moves on the party screen too, needing their
HMs (HGSS's HM05 and HM08: this game's HM06 Whirlpool and HM11 Rock Climb,
which Johto's scripts give; HGSS's Prof. Oak gives Rock Climb once you've sixteen Badges, so here he calls with it on the Pokégear as you get the Rising Badge) and Johto's Glacier and Rising Badges.
In Johto every HM move needs HGSS's Badge, not Kanto's (`game/field-moves.js`):
Rock Smash and Flash the Zephyr Badge, Cut the Hive, Strength the Plain,
Surf the Fog, Whirlpool the Glacier, Waterfall and Rock Climb the Rising;
only Fly needs none there (this game's own, so Kanto's Champion can get
about), and in Kanto FireRed's Badges hold as before. Ice Path's
slides are FireRed's ice. In Azalea's Gym (Heart & Soul's) an Ariados carries you over each of its
two pits: step on a station by a pit's pad and it comes up the web, you hop on, and it rides the web
to the station it pairs with (Heart & Soul's pairs, fixed, where HGSS's Spinarak carts have switches). The other Gyms' tricks are HGSS's (`src/field/gymmick`,
`ui/johto-gymmicks.js`), each Gym as it starts each time you go in:
**Violet's** walkways are high above its floor, and the lift in the middle
(step on its centre) takes you up to them, shaking as it goes, and back
down; **Ecruteak's** is dark, its floor hidden but close round you, its
entrance and Morty's dais lit, each Medium lit by the candle she carries
until you beat her and it goes out, and a step off the hidden walkway drops
you back to the entrance; in **Cianwood's** Chuck trains under the falls,
too busy to notice you until you turn the winch at the top of the Gym, which
stops them; **Mahogany's** ice is FireRed's ice you slide on, and its ice
blocks slide along it when you walk into them, stopping at a wall (to be
pushed again) or setting fast against someone, or frozen together against
another block for good.

**The GS Ball** (Pokémon Crystal's event): once you've been through the Hall of Fame, Prof.
Oak in his lab in Pallet Town gives you the GS Ball (a Key Item; Crystal's came from Goldenrod's
Pokémon Center and Kurt looked it over first). Check Ilex Forest's shrine with it and you're asked
(Crystal's words) whether to put it in; yes, and a wild **Celebi** appears at Lv. 50 (Crystal's was
30). Catch it and the GS Ball is spent; run from it or knock it out and the Ball rolls back out of
the shrine, to try again.

**Johto's scripts are HeartGold's own.** `tools/lib/hgss-script.js` compiles
each map's field scripts (`files/fielddata/script/scr_seq`: its people's and
signs' scripts, its step triggers, and its map scripts, on entering it and its
frame table) and their text into `data/johto-maps.js` (`window.JOHTO_SCRIPTS`),
and `ui/johto-script.js` runs them as HGSS does: messages (and Yes/No), people
walking and turning (HGSS's movements as FireRed's), people appearing and
going, flags and vars (HGSS's, kept in the save; the map's temporary ones
until you leave it), comparisons and jumps, items given and taken, menus,
fades, warps, trainer and wild battles (`TrainerBattle`, `WildBattle`, a
Rocket trap's Pokémon, a battle alongside someone), Badges (`GiveBadge`: Zephyr
to Rising), Pokémon and Eggs given, money and Coins, trainers beaten
(`SetTrainerFlag`), the phone numbers people give you (they don't ask
again), their story calls and the Pokégear's cards (see the Pokégear below), and elevators, leaving out what this game hasn't got (photos, the camera's
pans and other DS screens). So the Apricorn man on Route 30 comes out of his house
as you pass and gives you the Apricorn Box, Team Rocket harasses a man in Azalea Town, Lyra takes you to the Day
Care on Route 34, the Kimono Girl is lost in Ilex Forest, and the Sudowoodo
stands in the way on Route 36. **In-game trades and loans** are HGSS's
(`src/npc_trade.c` and its NPCTrade data, `files/a/1/1/2`, with their
nicknames and trainers, `msg_0200`: `tools/build-johto-script-data.js` writes
them, with HGSS's songs by number, the standard menus' texts and Headbutt's
tutor learnset, into `tools/lib/johto-script-data.generated.js`): the party
screen to choose a Pokémon (`PartySelectUI`, `GetPartySelection`), and FireRed's
trade sequence, so Violet City's Bellsprout gets you Rocky the Onix (its trainer,
IVs, nature, ability and held item, never shiny), and the rest of Johto's
trades likewise; Kenya the Spearow is lent to you on Route 35's gatehouse with
its Mail, which the sleepy man on Route 31 takes (TM44 for it), and Cianwood's
Shuckie is lent (`GiveLoanMon`) until Kirk asks for him back another day
(`CheckReturnLoanMon`: not if he's holding something, or he's all you've got
to battle with; he stays if he's grown fond of you). HGSS's daily flags clear
each day. The move commands are HGSS's: Ilex Forest's Headbutt tutor (who can
learn it by HGSS's tutor learnsets; a Pokémon with four moves forgets one on
FireRed's Summary screen), Blackthorn's Move Deleter and Move Maniac (the Move
Relearner's screen, for a Heart Scale), and ribbons are kept. HGSS's music
plays in its scenes (`PlayBGM`, the rival's, Lyra's or a Kimono Girl's theme,
and back to the map's), its jingles under the messages that call for them
(`PlayFanfare`: an item, a Pokémon received, a phone number registered), a
few sound effects as FireRed's nearest; the money box shows while you pay
(Moomoo Farm's milk), the screen shakes, menus show HGSS's texts (the standard
ones, msg_0191, and a map's own), and a map's script moves its warps
(Route 47's way into the Embedded Tower). Johto's story starts as HGSS's does
(its new game, `scr_seq_0149`: who's hidden until the story gets to them),
except that you come to New Bark Town from Kanto first, as if you'd just
left the house there (HGSS's Mom and Lyra's hello, inside it, are past):
then **Prof. Elm's Lab** goes on as in HGSS, with this game's own words
where HGSS's don't fit a Champion who's just arrived from Kanto: Elm
recognises you ("The Champion of Kanto, right here in my lab!"), wants to
see what a Pokémon becomes when a Champion raises it from its first step
(not HGSS's walking with Pokémon, or "your friend Lyra"), and offers you one;
then Mr. Pokémon's email, and his machine offers Chikorita,
Cyndaquil or Totodile (each one's picture, "You'll take ...?"; Lv. 5, joining
your party, and a nickname if you like). Then he gives you the **Pokégear**
("the newest technology from Johto's own labs... You won't find one in Kanto
yet": HGSS's Mom gives it; this game's Mom is in Pallet Town), to its
fanfare, before the healing machine and Mr. Pokémon's directions. Until he's
given you a Pokémon, New Bark's neighbour won't let you go west, and once he
has, Elm comes out to give you his number as you go. His aide's Potion, Lyra and her Marill
outside ("So you picked... Chikorita!"), **Mr. Pokémon's house** on Route 30
(the Mystery Egg; Prof. Oak, who knows you, of course: he's glad to see
Kanto's Champion running Elm's errands, and instead of a Pokédex he tells you
yours will record Johto's Pokémon too, "{PLAYER}'s Pokédex is ready for
Johto's Pokémon!", and gives you his number) and the rest follow on as HGSS
scripts them. Cherrygrove's Guide Gent isn't in this game: the Pokégear's Map
is yours from the start, and his tour and its triggers are gone. Nor is Route
29's catching tutorial (Lyra and her Marill, the throws, the five Poké Balls). Silver is
Silver from his first battle (no naming screen; HGSS's "Passerby Boy" is
"Rival Silver", with his own picture), and comes into Cherrygrove from Route
29's side, off the map's east edge, to meet you. Elm, seeing you off to the
Gyms, says "Take care out there, Champion!" (not HGSS's "talk to your mom":
this game's Mom is in Pallet Town). HGSS's party slot 0,
in its scripts, is the starter you chose, wherever it is in your party.
Rooms are as HGSS lays them out (so their scripts' steps and places hold),
drawn in FireRed's style too (`tools/lib/fr-room.js`): what you can walk to
from a room's doors (and from where its people stand, a Gym's platforms) is
its floor, the solid tiles with floor under them its back wall, two rows of
it, and the rest of its edges aren't drawn, as FireRed's rooms have no side
walls; the floor, walls and furniture get FireRed's Building tileset's
metatiles by what HGSS's textures call each tile (yuka: floor, tatami,
table, chair, shelf, bed, pc, plant, stairs, a doormat on the warp, and so
on), a house's wooden floor and a lab's grey one, a two-tile piece of
furniture its two tiles. (HGSS's own look of a room, as of its outdoors, is
`node tools/build-johto.js <pokeheartgold> --hgss`.) But for the
**Pokémon Centers** and **Poké Marts**, FireRed's own rooms, as the
gatehouses are: a Pokémon Center's nurse heals as Kanto's do (and it's where
you come to if you black out), upstairs is FireRed's Cable Club floor with
the Move Relearner and Deleter, and a Mart's clerks keep HGSS's scripts (the one with the town's own
stock above, the one with the standard stock below, nearer the door): the
standard stock by Johto's Badges (HGSS's tiers: Poké Balls, Potions,
Antidotes and Paralyze Heals with none, and more with more) and the town's
own.

**The S.S. Aqua** sails from Olivine once you've beaten Johto's Pokémon
League: at its gangway (or the port's sailor) you're asked where you're
sailing, Vermilion City or, flashing the Hoenn Ticket, Slateport City in Hoenn (before then, the ship is
only for Trainers who've beaten the League, and you step back). To
Vermilion the voyage goes as HGSS's scripts have it; arrived, you step off
onto FireRed's Vermilion dock, where the S.S. Anne was, and the S.S. Aqua's
sailor there takes you back to Olivine. To Hoenn it's as the Seagallop's
crossing (the first time, the moving truck's inside), and Slateport's sailor
sails you to Vermilion or, once you've beaten Johto's League, Olivine.

**The Radio Tower's Lottery Corner** draws a lucky number a day (five
digits, from the day and your ID) and checks it against your Pokémon's ID
numbers, the party's and then the PC's, for HGSS's prizes; **the Lake of
Rage's Fishing Guru** measures your Magikarp as Emerald's size records do
(from its personality and IVs, in inches), keeps the biggest, and the sign
outside shows it (`ui/johto-script.js`).

**The Magnet Train** runs between Goldenrod City and Saffron City as in
HGSS: its stations are HGSS's (Goldenrod's, and Saffron's, HGSS's Kanto map,
built with Johto's but counted as Kanto's), with their people and scripts.
The attendant greets you, the ticket gate checks you through (no Pass needed
here: "Ping...fwip! This train is about to leave for Saffron City."), and on
the stations drawn from Pokémon Heart & Soul's the train waits at the
platform past the gate: walk up into its door, the screen fades to the
train's theme as it goes, and you step off at the other station's door and
down through its gate (`ui/game.js` `magnetTrainBoard`). FireRed's Saffron has no
station, so the house at the west end of its top-left row gets a door (the
Copycat's house's, next door), into it. Goldenrod's train always runs;
Saffron's only once you're the Champion: until then its policeman stands in
front of the gate ("I'm sorry, but the Magnet Train to Johto isn't running
yet. It's only for the Champion of the Pokémon League."). `tools/build-magnet-train.js`
writes Saffron's door (`SaffronCity-patch-magnettrain.png`) and the stations'
changes (`tools/lib/johto-magnet-train.generated.js`), and
`ui/magnet-train.js` the ride (HGSS's `ScrCmd_722`) and Saffron's rule.

Scripts' TMs and HMs are this game's machines for
the same moves (HGSS numbers them its own way: its TM51 Roost is this game's
TM19), and the eleven HGSS TMs for moves no machine here teaches (Brine,
Endure, Dragon Pulse, Drain Punch, Silver Wind, Recycle, Avalanche, Stealth
Rock, Captivate, Natural Gift, Pluck) are new TMs after this game's last,
learned by the Pokémon HGSS lets learn them. The Gym Leaders give their TMs.

**Johto's League**: once you've Johto's eight Badges, the Indigo Plateau's
rooms are HGSS's: Elite Four Will, Koga, Bruno and Karen, and Champion Lance,
with their HGSS teams, sprites and lines (`files/fielddata` T10R0201-0601),
to HGSS's Gym Leader and Champion battle music; beat Lance and he takes you
to the Hall of Fame, and from then on they bring their rematch teams. (The
rooms, doors and Hall of Fame are FireRed's, as for Kanto's League.)

**Johto's trainers** (278) are HeartGold's (`files/poketool/trainer`):
their classes, names, parties (each Pokémon knowing the last four moves it
learns by its level, as Kanto's trainers' do), lines and sight; they battle
as Kanto's do, with HGSS's own trainer pictures (Gen 4's 80x80, drawn for the
DS's bigger screen, so shown 64 tall, FireRed's size, where Kanto's trainers
stand: `assets/sprites/trainers/front/hgss_*.png`,
and Diamond and Pearl's `dp_*.png` for the classes HGSS shares with them),
made by `tools/build-hgss-trainer-pics.js` from a
[smogon/sprites](https://github.com/smogon/sprites) checkout
(`node tools/build-hgss-trainer-pics.js <path>`), each class's picture in
`tools/lib/hgss-trainer-pics.json`. Item balls, small trees (Cut) and
breakable rocks (Rock Smash, with HGSS's Pokémon under them: two slots, 90
and 10 percent) work as Kanto's, and each Apricorn tree bears an Apricorn of
its colour (`src/apricorn_tree_sys.c`) once a day: this game adds the seven
Apricorns (pictures from `assets/sprites/items/apricorn`), the Apricorn Box,
the Squirtbottle, the Berry Pots and the VS Recorder, which the scripts give
or ask for. Wild Pokémon are HeartGold's by the time of day, as HGSS has
them: morning (4-10), day and night (20-4), e.g. Route 29's Pidgey and
Sentret, and Hoothoot at night; then Surf's, Gen 4's fishing (five slots a
rod, 40/40/15/4/1) and Rock Smash's. Everything goes into
`data/johto-maps.js`, which adds the maps to `WORLD_MAPS` (and the gate's mat,
warp and guard). Not here yet: the Battle Frontier, which comes with Sinnoh's;
in its place, north of Route 40 through its gatehouse, stands Crystal's
**Battle Tower** (this game's own, in FireRed's Trainer Tower lobby drawn
again there, its stairs walled over: there are no floors above). At the
counter, or from its receptionist, choose three Pokémon (Crystal's rules: no
two of the same Pokémon, no two holding the same item, no Eggs), then go
into its battle room (Emerald's Battle Tower's) and battle seven of the
Trainer Tower's trainers in a row, each walking in and, once beaten, out
again before the next walks in, each
with three of their six Pokémon (FireRed's sets) scaled to your strongest's
level, your three healed between battles, with no Exp. or money; you may
stop between battles, and a loss ends the challenge. Seven wins earn two
prizes from Trainer Tower's own pools (vitamins, PP Ups, Rare and Exp.
Candies, mints and everyday held items; from Lv. 40 Bottle Caps, PP Maxes and
the stronger held items too; from Lv. 70 Gold Bottle Caps and Ability
Capsules and Patches: `TrainerTower.rewardsAt`) and bonus Battle Points (3,
and 1 more for every 20 levels); every win on the way earns BP too (1, and 1
more for every 50 levels). The lobby's nurse heals, its clerk is the BP Shop,
the BP tutors (the Trainer Tower's: their moves, and Egg moves) teach for BP,
and the sign by the counter keeps your best streak.
(Its music is HGSS's own: see Music and cries.)

**Goldenrod's Game Corner** is the international HeartGold's: Mr. Game's
table and its game, **Voltorb Flip** (`ui/voltorb-flip.js`, from
`src/voltorb_flip/`), and two prize counters. Talk to Mr. Game and he gives
you a Coin Case (Kanto's Game Corner takes it too, and Kanto's takes his);
sit across from him (the table's near side, facing up) and play. The board's
25 cards hide 1s, 2s, 3s and Voltorb; the totals at the end of each row and
column say what they add up to and how many Voltorb are among them. The
first number you flip is your payout, each one after multiplies it, and a
Voltorb loses it all; quit (B, or the Quit button) to keep what you've got,
or find every 2 and 3 to clear the board and take it. The boards, levels and
payouts are HGSS's: each level's ten boards (`sBoardConfigs`: how many
Voltorb, 2s and 3s, and how many 2s and 3s may lie where no Voltorb is), up a
level for a clear and down to as many cards as you flipped when you lose
(Lv. 8 from five good rounds in a row), up to 50,000 Coins. Its Memo (Select,
Backspace or C, or the button) marks a card with Voltorb, 1, 2 or 3; Game Info
explains it all, in HGSS's words. Its pictures are HGSS's, from the game's
NARC (`files/application/voltorb_flip`: its tiles, palettes, screens and
sprite cells) drawn a little smaller to fit FireRed's screen, by
`node tools/build-voltorb-flip.js <path to pokeheartgold>` into
`assets/voltorb-flip/`, with FireRed's windows and font for its words; and
the jingles are HGSS's (the "Is this what you're expecting?!" suspense, the
Voltorb, the clear). The prize counters run HGSS's own scripts: the gentleman
on the left trades Pokémon (Abra 200 Coins, Ekans 700, Dratini 2,100, Lv.
15), the one on the right TMs (Substitute 2,000, Swords Dance 4,000, Rest
6,000, Flamethrower, Ice Beam and Thunderbolt 10,000) and held items (Silk
Scarf, Wide Lens, Zoom Lens, Metronome, 1,000 each), your Coins in a box at
the top right. (Their menus, HGSS's `MenuInit`, come from the map's own
messages, which the same builder writes into
`tools/lib/johto-game-corner.generated.js`; HGSS's TMs are this game's TMs
with the same moves.)

**The walking Pokémon** (HGSS's follower: `ui/follower.js`, and the
follower section of `ui/overworld.js`): your party's first Pokémon
(the first that can still fight) walks a step behind you, on the tile you've
just left, as fast as you go, hopping after you over ledges, round the
corner onto the next map; out of a door it comes out beside you, on your left (your right if
that's blocked), not in the doorway. It's
HGSS's own overworld sprite (every species to Arceus, its forms and females'
own looks; Lugia, Steelix and the big ones at 64x64), and for the species and
forms HGSS hasn't got, FireRed's look: its party icon
(`assets/world/sprites/follow/`, made by `tools/build-hgss-followers.js` from
a pret/pokeheartgold checkout: `node tools/build-hgss-followers.js <path>`).
It keeps out of sight while you ride the Bicycle or Surf, and comes along
where HGSS lets it (each Johto map's follow mode: not at all in a few, and
not the tall ones, Lugia, Steelix and the like, in rooms); people walking
about go round it, and you can walk back through it. Talk to it (A facing
it) and it turns to you with its cry and a line from HGSS's follower
messages for how it is (poisoned, burned, its HP low), where you are (tall
grass, a cave, indoors, by the water, morning or night) or how it feels
about you (its friendship: "Pikachu is so happy, it started dancing!",
"...looks a little downhearted..."); now and then (once a day) it's found
something and holds it out to you: a Potion, a Berry, a Great Ball, more as
you've more of Johto's Badges. In HGSS's scenes it keeps up with you
(`ToggleFollowingPokemonMovement`, `FollowingPokemonMovement`,
`WaitFollowingPokemonMovement`: Lyra takes the two of you to the Day Care).
It follows you in Kanto too (this game's: the tall ones stay out
of its rooms), unless the Option screen's **FOLLOWER** is OFF.

**Headbutt trees**: HGSS's Headbutt trees on Johto's routes and towns, and
their Pokémon (`files/arc/headbutt.json`: `tools/build-johto-headbutt.js`,
`ui/johto-field.js`). A facing one with a Pokémon that knows Headbutt: "It's
a moderately sized tree. Would you like to use Headbutt?"; it shakes, and a
Pokémon may fall out. Which trees are good goes by your Trainer ID's last
digit, as HGSS's (src/field/headbutt.c: some of a map's trees have its common
Pokémon for you, some its rare ones, some none), and the Pokémon by slot
(50/15/15/10/5/5); without Headbutt, "There's a large, formidable tree that
looks like it can be headbutted!". Headbutt is taught, as in HGSS, by the man
shaking trees in Ilex Forest, to the Pokémon HGSS's tutor can teach.
**Kurt's Apricorn Balls**: give Kurt Apricorns in Azalea Town (HGSS's
script; which colour and how many, on HGSS's Apricorn Box screen,
`ui/apricorn-box.js`: the box's seven holes with an Apricorn of each colour you
have and how many in the bubble beside it, what the one under the cursor is, then
"Give how many?" and "Give 3 Red Apricorns?"; the box's picture HGSS's own, by
`node tools/build-apricorn-box.js <pokeheartgold>`, the words in FireRed's
windows; used from the Bag the Apricorn Box opens the same screen to show your
Apricorns) and the next day (the game's day, `Player.gameTime().today`) he has that many Balls
for you: a Red Apricorn makes a Level Ball, Yellow a Moon Ball, Blue a Lure
Ball, Green a Friend Ball, Pink a Love Ball, White a Fast Ball, Black a Heavy
Ball. They catch as HGSS's makers meant them to: the Level Ball 2, 4 or 8
times as well as your Pokémon's level is above, twice or four times the
wild one's; the Lure Ball three times when you're fishing; the Moon Ball
four times on a Moon Stone's family; the Love Ball eight times on one of
your Pokémon's species of the other gender; the Heavy Ball by weight (20
less to the catch rate under 204.8 kg, 20, 30 or 40 more over); the Fast
Ball four times on a Pokémon of 100 Speed or more; and the Friend Ball's
Pokémon start out friendly.

**The Bug-Catching Contest** is HGSS's, in the National Park, once each
time you've beaten the Elite Four (this game's rule, in place of HGSS's
Tuesdays, Thursdays and Saturdays: `ui/bug-contest.js`, from `src/overlay_bug_contest.c`;
its scripts are HGSS's own std scripts, `scr_seq_0151`, which the officer in
either of the park's gatehouses calls). He signs you up: you go
in with your lead Pokémon only (the rest are held for you), 20 Sport Balls
and 20 minutes, the time left counting down in a box in the park's corner
(and on the Start menu, beside RETIRE; no BAG or SAVE meanwhile). The
contest's park has its own wild Pokémon (HGSS's `files/data/mushi`: Caterpie,
Weedle, Metapod, Kakuna, Butterfree, Beedrill, Venonat, Paras, Scyther and
Pinsir without the National Pokédex; with it, Kanto's bugs at Lv. 24-36 the first time,
then Hoenn's, then Sinnoh's, in turn: HGSS's Tuesday, Thursday and Saturday sets), fought as
any wild Pokémon is, with only your Sport Balls in the Bag. Catch one while
you're holding another and you're asked whether to switch. Five of the ten
other contestants (Don, Ed, Abby, William, Benny, Barry, Cindy, Josh,
Samuel, Kipp) are about the park with their own bugs and scores. Time up,
out of Sport Balls, done early at the gate or RETIRE, and you're judged in
the park, the contestants lined up: your bug's score is HGSS's (its kind's
points, its level against the highest it comes at, its IVs and the HP it
has left), and the prizes are a Sun Stone (with the National Pokédex, one of
ten evolution stones), an Everstone, a Sitrus Berry, or a Shed Shell for
everyone else. Your party comes back, and you keep the last bug you caught
(nicknamed if you like; to the PC if your party was full). Leaving another
way (Fly, blacking out) calls it off. `tools/build-bug-contest.js` builds
its data and scripts from a pret/pokeheartgold checkout into
`tools/lib/johto-bug-contest.generated.js` (`node tools/build-bug-contest.js
<path>`), which goes at the end of `data/johto-maps.js`.

**The Pokéathlon** (the Pokéathlon Dome, through the gatehouse north of
Route 35): its scripts are HGSS's (Whitney's jersey, the Athlete Shop, the
vending machine, the records' rooms), and the receptions' shared script,
`scr_seq_0167` (HGSS's script numbers 9850-9852, which the map build leaves
out), is added by `tools/build-pokeathlon.js` (`node tools/build-pokeathlon.js
<pokeheartgold>`: it writes `tools/lib/johto-pokeathlon.generated.js` and puts
it into `data/johto-maps.js`). At the middle counter, JOIN and pick a course:
**Speed** (Hurdle Dash, Pennant Capture, Relay Run), **Power** (Block Smash,
Circle Push, Goal Roll), **Skill** (Snow Throw, Goal Roll, Pennant Capture),
**Stamina** (Ring Drop, Relay Run, Block Smash) or **Jump** (Lamp Jump, Disc
Catch, Hurdle Dash), as HGSS has them; you walk through the gate, change, and
choose three of your party, against three teams of the computer's. Each
Pokémon has HGSS's five **Performance** stats (Speed, Power, Skill, Stamina,
Jump, one to five stars: each species' base and range from
`performance.narc`, moved each day by its nature and personality as
`CalcBoxMonPokeathlonPerformance` does, by the game clock's day; no
Aprijuice), shown on the team screen. HGSS's ten events are touch-screen
games; here (`ui/pokeathlon-events.js`) each is a small game for the D-pad, A
and B on a 240x160 screen, the Pokémon their party icons over their team's
colour (yours red): Hurdle Dash (a relay over hurdles: A jumps; the three
legs' time), Pennant Capture (pick up pennants, nine at most, and bring them
home to your corner; dash into one from behind to take its pennants), Relay
Run (hold A to run round the track, B hands over before it's worn out; the
laps), Block Smash (A smashes, each blow tiring; the blocks), Circle Push (six
rounds: when each runs out, a Pokémon in the middle circle scores 3, in the
ring round it 2, on the rest 1; A tackles them off), Goal Roll (tackle balls
into the other teams' goals; one into your own counts against you), Snow
Throw (aim and throw; the hits), Ring Drop (knock the others off the ring, 10
each), Lamp Jump (A as you land bounces higher; touch the lamps) and Disc
Catch (run and jump for the discs; high catches score more). Speed makes a
Pokémon run faster, Power push, smash and throw harder, Skill turn quicker
(and the computer aim and time better with it), Stamina keep going, Jump jump
higher. Each team's result is turned into points as HGSS does it (overlay
96's table, 200 at most): Hurdle Dash 11,500 over the seconds (in 30ths),
Pennant Capture, Circle Push and Snow Throw three a point, Block Smash one a
block, Disc Catch 150 - 120 / (1 + 0.08 x its points), Lamp Jump its points
over 3.5, Relay Run ten a lap, Ring Drop 1.5 a point, Goal Roll five a goal
and 100, 80, 70 or 60 for its place. Then the closing ceremony's bonuses
(HGSS's): the Challenge Bonus (75 less the team's base stars), 10 for each
Pokémon that didn't fail, fall or score against itself (the No-Miss Bonus),
20 for the one that brought in the most (the points leader), and 10 for the
one that jumped, tackled, failed or dashed the most (one of those four,
drawn); ties are settled by a drawing. Then, in the ceremony, the Medal (each
of your three Pokémon's, for that course, when you win) and "beat its
personal best" (a new winning record for the course), before you're back at
the reception: your score is that many Athlete Points (as HGSS adds them; the
reception's script says so, and gives 100 more for first place). HGSS's
records are kept (`ui/pokeathlon.js`, in `player.flags.pokeathlon`): the
courses joined and won, each event's wins, the jumps, tackles, dashes,
switches and so on that the Dome's people and signs read (`ScrCmd_724`'s
numbers as `src/field/scrcmd_pokemon_misc.c` has them), each course's best
winning score, each event's five best results and the Medals each species
has won; the basement's rooms open as HGSS opens them: the Trust room once
you've won all five courses, the Potential room once one of your Pokémon has
all five Medals, and the Friendship room once each event's best is past
HGSS's mark (30 seconds of Hurdle Dash, 35 pennants, 80 blocks, 12 laps, ...).
The records' rooms and the Pokéathlon data person show them (the data, as in
HGSS, "???" where a Data Card hasn't unlocked it). The **Athlete Shop** sells HGSS's prizes
of the day of the week (the game clock's; `sPokeathlonPrizeExchangePriceOverrides`: Apricorns, Moomoo Milk,
evolution stones, the Shiny Stone, Rare Candy, PP Up, Heart Scales and so on,
more with the National Pokédex), each once a day, paid in points; the
vending machine takes money or points. Not here: the Supreme Cup's own
reception (her flag keeps her away, as in HGSS until then), the Link
Pokéathlon, the Data Cards and Aprijuice.

**Johto's Safari Zone** is HGSS's, west of Cianwood through the Safari Zone
Gate. Its six places, three across and two down, each hold one of HGSS's
twelve Areas (Plains, Meadow, Savannah, Peak, Rocky Beach, Wetland, Forest,
Swamp, Marshland, Wasteland, Mountain, Desert): each is a 32x32-tile chunk
HGSS puts on the Safari Zone's matrix where its layout says
(`PlaceSafariZoneAreas`). `tools/build-johto-safari.js` draws each Area in its
place in the Safari Zone round it, in FireRed's style
(`assets/world/maps/SafariZone_EntranceExterior-patch-<area>.png`), and writes
`tools/lib/johto-safari.generated.js` (added to the end of
`data/johto-maps.js`): each Area's tiles, its Pokémon (`files/arc/safari_enc.json`:
the grass's, Surf's and the three rods', ten slots one in ten each, by
morning, day and night), HGSS's ten default layouts and its Safari flee rates
(`node tools/build-johto-safari.js <path to pret/pokeheartgold>`, before
`build-johto.js`). `ui/johto-safari.js` puts the Areas where your layout has
them (one of the ten defaults at random, the Peak always in the middle of the
bottom row, as a new HGSS game takes), their pictures as the map's patches and
their tiles in its collision, and makes its wild Pokémon those of the Area
you're in. The Safari Game is HGSS's (the counter's scripts, run with
`SafariZoneAction`): ₽500 for 30 Safari Balls and no step limit; every wild
Pokémon is a Safari battle with HGSS's BALL, BAIT, MUD and RUN (Bait makes it
stay but harder to catch, Mud easier to catch but likelier to flee, on HGSS's
stages: `engine/safari.js`, with each species' HGSS flee rate); when the
last Ball's thrown you're back at the counter ("Ding-dong! You've run out of
Safari Balls." if it caught something), and walking out of the gate or the
Start menu's Retire asks if you're leaving. Baoba's Owner Aptitude Test is
HGSS's: catch a Geodude (in the Peak), then, the next time you come to the
Safari Zone Gate (HGSS's Baoba phones three hours later), he shows you the
**Area Customizer**: with it (talk to the staff beside him) you choose a place
and Swap in any of the twelve Areas (one already in the layout trades places)
or change their Order; then a Sandshrew from the Desert makes you the Owner.
**Object Arrangement** is HGSS's too: once you're the Owner and have the
National Pokédex, Baoba phones (three hours of the game clock after his last
call; without a Pokégear, he tells you at the Gate) to give you HGSS's 24
objects in four groups of six (Plains, Forest, Peak, Waterside), a group at
a time, in the order your Trainer ID picks. In the Safari Game press A facing
open ground (or water while surfing, for the Fountain) to place one, or
facing an object to take it away; or arrange an Area's objects (up to 30) on
its grid from the Area Customizer's Objects (`ui/johto-safari-objects.js`).
Objects block the way and are drawn on the map. Each object of a kind is
worth points of that kind, more the longer (in the game clock's days) its
Area has been in your layout (`sObjectLevelBoosts`), and enough points bring
the Area's bonus Pokémon in over its first slots
(`SafariZoneAreaSet_LoadAreaEncounters`); when that happens, Baoba calls to
say which Areas changed. A slot's morning, day and night Pokémon are all
equally likely, as everywhere else. Not here: the Safari Zone Link.

**Johto's Town Map**: in Johto the Town Map (and Fly's) is Johto's: HGSS's
Pokégear map of Johto, its own picture (`tools/build-johto-town-map-picture.js`
copies it pixel for pixel from a pret/pokeheartgold checkout's
`pgmap_gra`, the map the Pokégear draws, onto the 240x160 page; each place is
on the square HGSS gives it, the grid's from `tools/build-johto-town-map.js`),
with HGSS's place names, your icon where you are and FireRed's small icons
on its caves, forests and towers. Fly takes you to the towns and cities
you've been to (going into a Pokémon Center counts), landing outside the
Pokémon Center as HGSS does. On the Town Map, and on Fly's map too, SELECT
(Backspace) or R turns through every map you have, Kanto's, the Sevii
Islands' pages and Johto's (once you've been there), the region you're in
first, so you can fly from one region to another.

**The Pokégear** (`ui/pokegear.js`) is HeartGold's, in FireRed's look: once
Elm has given it to you (HGSS's `FLAG_GOT_POKEGEAR`) it's on the start
menu, under the Bag (eight entries then: a pixel closer together, so the
window ends where the help bar begins). Its cards are along the top in HeartGold's gold, with the
day and time: the **Phone** and the **Map** (always: HGSS's Guide Gent, who
gives the Map, isn't in this game), and the **Radio** once you've won its card at the Radio
Tower (the scripts' `RegisterPokegearCard`); left and right turn between them,
B puts it away. The Phone lists the numbers you have (HGSS's names and classes:
"Joey, Youngster", "Prof. Elm, Pokémon Professor"), and A calls one: the line
rings ("...... ...... ......"), they answer with HGSS's own words, and it goes
("Click! ......"). Whoever's on the line, calling or called, is pictured in a
frame by their name (this game's own): the story's people by their overworld
sprite (Mom, Elm, Oak, Lyra or Ethan, Kurt, Bill, Buena, the Day-Care couple,
the Bike Shop, Baoba), a trainer by theirs where they stand, or else their
trainer picture made small (the Gym Leaders). What they say is HGSS's call table (`src/application/pokegear/phone`):
a trainer's greeting for the time of day (msg_0640), then the first of their
call scripts whose test passes (`sGenericPhoneCallHeaders`: by chance, on
their day and time, after the Radio Tower, during Team Rocket's takeover...):
one of their Pokémon or one in the wild where they are, wanting a rematch
("Let's get together and battle! ... Route 30's where I'll be."), or a gift
waiting for you; nearby, "What's with the phone call? Come talk to me!".
Prof. Elm's go by the story (the Egg, the radio, the Badges); Lyra or Ethan,
Kurt, Bill, Buena, Irwin, Kenji, the Day-Care couple, the Bike Shop, Baoba and
the Gym Leaders have their own (Prof. Oak's tells you how many Pokémon you've
seen and caught). The scripts' story calls (`PhoneCall`: Elm's panic call
on Route 30 after Mr. Pokémon, his Egg call in Violet City, the radio, and
Oak's and Baoba's) ring through it, and **calls come while you walk** as in
HGSS (`GearPhoneRingManager`; the Option screen's **GEAR CALLS**: OFF stops
the chatter, the story's calls still come): once 300 steps have gone by (three times HGSS's ten
minutes; there's no real-time clock, so the Pokégear's day and time are the
game's step clock), the next step
has a one in three chance of a call from someone whose number you have (half the
time one of the first group, then 30 and 20 percent), each in turn, never
from the map you're on; Elm calls when his Mystery Egg hatches. A
**trainer** with a phone number (HGSS's phone book, `files/tel`) asks for
yours on the map after you beat them, once you have the Pokégear ("Hey, can I get your number?"; Yes, and
"Registered the phone number in the Pokégear!"), and again if you said no and
talk to them. When one calls wanting a rematch, talk to them and they battle
with their rematch party (`GetPhoneBookRematch`: HGSS's tiers, `TRAINER_X_2`,
`_3`, `_4`, the next as the story lets it: after the Radio Tower, the Elite
Four, then Blue), and give their gift when beaten (Joey's HP Up); a gift
they called about is theirs to give when you talk to them. **Mom** isn't in the phone book, and
nobody saves your prize money or buys you things with it (HGSS's Mom does, but
she's Ethan's mother here, not yours; in New Bark Town she only says hello). An
older save's savings with her go back into your wallet, and anything she'd
already bought is still with the deliveryman in Johto's Poké Marts. **Gym Leaders' rematches**: once you've won Johto's League, each of the
sixteen Gym Leaders gives you their number when you talk to them in their Gym.
Call them on their day and time (HGSS's phone book: Whitney on Saturday
afternoons, Falkner on Saturday mornings, and so on) once you've all sixteen
Badges, and they'll wait for you at Saffron's Fighting Dojo (five at most at
once) to battle with HGSS's rematch teams (`TRAINER_LEADER_*_2`). The Map card shows the region's Town Map small with where you are, A
the Town Map itself. The Radio tunes to HGSS's stations (`Radio_GetAvailableChannels`):
**Pokémon Music** (DJ Ben: the Pokémon March on Mondays, Wednesdays, Fridays
and Sundays, the Lullaby on Tuesdays, Thursdays and Saturdays), **Pokémon
Talk** (Mary and Prof. Oak on five places in the region and a Pokémon there,
mostly one you haven't caught) and the Variety Channel, which goes by the hour
as HGSS's does (`RadioShow_TranslateStationID`: the hour's remainder by
three): the Pokémon Search Party, the Serial Radio Drama, then **Buena's
Password** (at 2:00, 5:00, 8:00 and so on). Her password is one of HGSS's
thirty (`msg_0066_D23R0102`), a new one at random each day, never the same
twice running. With a Blue Card you hear it, and Buena at the Radio Tower
asks for it that day; only the Unown's mysterious transmission in the Ruins of
Alph's hall, the Mahogany signal round Mahogany until the hideout's cleared,
and Team Rocket's broadcast while they've the Radio Tower; Kanto has Music,
Talk and the Poké Flute. Each show's lines come one by one with its song
(HGSS's: the March, Lullaby and Unown songs are built into
`assets/audio/johto-music.js` by `tools/build-johto-audio.js` for it), and
the song plays on as you walk, until you go to another map or into a battle:
while the March plays, wild Pokémon come twice as often; the Lullaby, half as
often. `tools/build-johto-phone.js` builds the phone book, call scripts,
greetings, rematch tiers and parties and the radio's shows from a
pret/pokeheartgold checkout (`node tools/build-johto-phone.js <path>`, into
`tools/lib/johto-phone.generated.js`, which `tools/build-johto.js` puts at the
end of `data/johto-maps.js`).

**The Ruins of Alph** are HGSS's (`ui/johto-alph.js`, pictures by
`tools/build-alph.js` from a pret/pokeheartgold checkout: `node
tools/build-alph.js <path>`). In each of the four chambers a stone panel lies
over a hole in the floor; examine it (`AlphPuzzle`) and HGSS's sliding-tile
puzzle comes up, its board and pieces HGSS's own (`src/alph_puzzle.c`,
`application/annon/puzzle_gra`), in your window frame, the Pokémon's words
beside it: Kabuto, Aerodactyl, Omanyte and Ho-Oh, each laid out as HGSS lays
it out, most pieces in place and the rest round the edge, turned. The D-pad
moves the cursor over the board, A picks a piece up and puts it down where the
cursor is (on the board but not its corners, nor on another piece), or turns
it a quarter if you put it back where it was (HGSS's touch without sliding); B
puts it back, or asks if you'd like to quit; a tap or click works too. Put
together, the pieces flash white, the chamber shakes, the panel's gone and the
floor falls in: you drop into the Underground Hall below, where, the first
time, the Research Center's assistants come running with the **Unown Report**
(a key item: HGSS's book, overlay 113, a page to the screen on HGSS's own paper
in its blue binder, turned with the D-pad, B to close: the cover with your name and
how many kinds you've caught, then the Unown you've caught seven to a page, each
with its icon and its word, ANGER to ZOOM, !!!!! and ?????, in the order you
caught them until the report's level 4 sorts them A to Z, then the researchers'
notes, a page at a time as the report's level, `VAR_UNOWN_REPORT_LEVEL`, comes up
to it, the words on the hidden room's floor in the Unown font; its pictures by
`tools/build-alph.js`, from HGSS's NARC a/2/3/9, its words msg_0001's). Each solved puzzle
wakes Unown in the hall (`src/field/encounter_check.c`): none until one's
solved, then Kabuto's A to J, Aerodactyl's R to V, Omanyte's K to Q and
Ho-Oh's W to Z, any of those woken, and ! and ? in its Sinjoh room (a wild
Unown's letter as Tanoby's are: `Party.create`'s `unown`); you meet them on
the hall's floor, as you do in caves (HGSS's encounter tiles,
`sMetatileBehaviorFlags`, now the maps' encounter tiles: caves' floors too).
At the back of each chamber the wall bears a word in the Unown font
(`OpenAlphHiddenRoom`: HGSS's tablet, `msg_0198`): ESCAPE, LIGHT, WATER and
HO OH. Use an Escape Rope (it's kept), Flash or a Water Stone standing in
front of the right one (`src/alph_checks.c`), or bring Ho-Oh, and it opens on
a room of replicas and items; its floor gives way into a hidden room of Unown
writing, and that one's into the hall. The Research Center's people follow
your Unown (`CheckSeenAllLetterUnown`: all 26 letters; how many kinds you've
caught) and the puzzles solved, and the professor adds to your report as HGSS's
does. (Script warps now name their maps, so every script's warp works.)

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
- **Level caps** (this game's own: the adventure goes region by region,
  Kanto, then Johto, then the rest): in a region, your Pokémon grow no further
  than its cap for the Badges you have of that region's eight: the level of the
  next Gym Leader's ace (in Kanto Lv. 14 with none, Brock's Onix, then 21, 24, 29,
  43, 43, 47 and 50; in Johto 13, 17, 19, 25, 31, 35, 35 and 41, Pryce's 34 under
  Jasmine's 35; in Hoenn 15, 19, 24, 29, 31, 33, 42 and 46), and no cap with all
  eight (`Player.levelCap`). Kanto's side places (the Sevii Islands, Stadium Island, Orre, Faraway
  Island, and everything east of New Bark Town: Route 27, Tohjo Falls, Route 26,
  Route 28 and Mt. Silver, so the way home can be walked without your Pokémon
  turning disobedient) go by Kanto's Badges, Johto's maps by Johto's. A Pokémon at the cap
  gains no Exp. Points in battle (and nothing's said about it), Exp. Candies and Exp. Points from
  battle take it no further than the cap, a Rare Candy or Exp. Candy used on
  it fails, and the Day-Care grows it no further either. One over the cap
  (traded, or brought to Johto from Kanto) may not obey, as in FireRed
  (IsMonDisobedient, the cap as its obedience level): the further over, the
  likelier it ignores orders and uses another move, loafs around, turns away,
  pretends not to notice, takes a nap or hurts itself.
- **The Rejuvenator**, upstairs in every Pokémon Center (Kanto's and Johto's), makes a
  Pokémon Lv. 5 again (and heals it), keeping everything else: what it's
  evolved into, its moves, EVs, IVs, nature and ability, so you can take a
  team you've trained into a new region under its caps.
- **Wild held items**: a wild Pokémon in the grass, on the water, on a rod,
  under a smashed rock or in the Safari Zone may be holding an item:
  FireRed's for its species (`.itemCommon` and `.itemRare` in
  src/data/pokemon/species_info.h), or Emerald's (Ruby and Sapphire's) when
  FireRed gives it none, such as Pikachu's Oran Berry and Light Ball, and
  nothing when neither does (or for anything past Gen 3); `data/wild-items.js`,
  from `node tools/build-wild-items.js <pokefirered> <pokeemerald's species_info.h>`.
  As in FireRed (SetWildMonHeldItem): 50% the common item, 5% the rare one,
  and always the item when both are the same (Shuckle's Berry Juice); a lead
  Pokémon with Compound Eyes makes it 60% and 20%, as in Emerald. The lead
  Pokémon's other field abilities work as in the latest games that have them
  (Sword and Shield, Scarlet and Violet; `game/encounters.js`): Synchronize
  gives a wild Pokémon its nature, Cute Charm makes it the opposite gender two
  times in three; Static and Lightning Rod make it an Electric type half the
  time (Magnet Pull a Steel type, Flash Fire a Fire type, Storm Drain a Water
  type, Harvest a Grass type) when the area has one; Keen Eye and Intimidate
  turn away half the Pokémon five or more levels below the lead's; Hustle,
  Pressure and Vital Spirit make it its slot's highest level half the time;
  Stench, White Smoke, Quick Feet and Infiltrator halve how often wild Pokémon
  appear, Illuminate, Arena Trap and No Guard double it. (Sticky Hold and
  Suction Cups would make fish bite more often, but every cast here bites.)
  **Pickup**: after a battle, each of your Pokémon with Pickup that holds
  nothing has a one-in-ten chance of picking up an item, by its level, from
  this game's rendering of Scarlet and Violet's table (only its Lv. 1-10
  row is checked against Serebii's; the rest are still to be checked) (Potions, Full Heals
  and mushrooms low down; Nuggets, Max Elixirs, PP Ups and Rare Candies high
  up: `Encounters.PICKUP`); it holds the item, and the game says so. Thief and
  Covet can take it, a Berry gets eaten, and caught, it keeps what it still
  holds. Knock one out and it drops what it was still holding, which goes in
  your Bag (this game's own: "The wild … dropped a …!"). The legendaries
  waiting on the map hold nothing, as in FireRed.
- **Shiny Pokémon**: any Pokémon you meet or are given is shiny 1 time in 4,096
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
  on FireRed's Move Relearner screen (each move's category icon, physical,
  special or status, above its effect, as on the Summary screen; the
  tutors' screens too); with four moves already, you pick one to
  forget on the Summary screen's move list, as for TMs and tutors;
  the Deleter makes it forget a move, free.
- **Explorer Kit** (a key item you start with): use it from the bag in a cave
  (Mt. Moon) to dig in the wall, as in Diamond and Pearl's Underground. Hit
  tiles (the D-pad and A, or tap / click them; B or tapping the tool switches
  it) with the Pickaxe (1 energy) or the wider Hammer (2 energy) to clear
  the rock (1-6 layers; no bedrock here: every tile can be dug) and uncover buried
  treasures (2 up to mining level 10, 3 up to 20, then 4). The dig ends when every treasure is out (they go in your bag) or
  your energy runs out (40 at mining level 1, and 2 more each level: 238 at
  level 100). What a hit dug up is told under the board until the next hit.
  Every hit earns 1 mining XP and every treasure 10 more; the top of the
  screen shows your mining level, a bar to the next one, and your energy.
  Levels go up on a curve: 20 + L²/20 XP from level L to the next (20 at
  first, 40 at level 20, 145 at 50, 510 at 99; 18,365 XP in all for level 100). Only common treasures (Heart Scales and shards) turn up
  at first; rarer ones unlock along the way: Hard Stones and Everstones at 5,
  Metal Coats, King's Rocks and Ice Stones at 25 (the Ice Stone at 20),
  Revives, Star Pieces and Oval Stones at 10, the vitamins (HP Up, Protein,
  Iron, Calcium, Zinc, Carbos) at 15, the evolution stones at 20,
  every fossil at 30, some held items at 38 and 51, Bottle Caps at 40, Max
  Revives and Rare Bones at 63, the Ability Patch at 70, Gold Bottle Caps at
  80 and the plates at 100. Each fossil is only found in its own caves:
  Kanto's (Helix, Dome, Old Amber) in Mt. Moon; later regions' fossils will
  Tools (SELECT, or B, changes tool): the Pickaxe; the Hammer from mining
  level 5 (the eight tiles round it too, 2 energy); the Bomb from level 10
  (goes off somewhere at random: 2 layers off the tiles within 2 of it, 1 off
  those out to 3 or so, 6 energy); the Survey Kit from level 20 (digs nothing,
  but tells you what's still buried, 2 energy). A level that brings a new
  tool says so.
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
  basket on your head (a berry that touches you or the basket at all is
  caught): a ripe one is 10 points, a gold one 30, every good
  catch in a row adds a combo bonus (2 a catch, up to 20), a green one caught
  costs 10 and breaks the combo, and so does letting a ripe or gold one drop.
  A game lasts 30 seconds, and 10 more for every 10 farming levels (40 at
  level 10, 130 at 100); every perfect shake adds 1 more (never more than the
  game's full time left); when time's up you can't shake the tree, but you can still
  move until the last berries are down. You take home a berry and one more for every 60
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
  four shake checks); this game's own catch rate for Bulbasaur, Charmander
  and Squirtle is 120 (45 in the games). Poké, Great, Ultra, Master, Net, Nest, Repeat, Timer,
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
  Gyarados (Dragon/Water), Psyduck and Golduck (Water/Psychic), Blastoise
  and Mega Blastoise (Water/Steel), and Chansey (Fairy/Normal).
- **Moves**: Gen 6's, except Leech Life, which is Gen 7's (80 power, 10 PP), plus
  Gen 7's Instruct and Spotlight for double battles (no Pokémon learns them).
- **X items**: X Attack, Defense, Sp. Atk, Sp. Def, Speed and Accuracy raise
  that stat of the Pokémon in battle one stage (Gen 6).
- **Items**: Gen 6 effects for potions and drinks, status cures, Revives, PP
  restores, vitamins (10 EVs each, up to 252 in a stat, as from Sword and Shield) and Rare Candy. In battle, using
  an item takes your turn and happens before moves.
- **HMs**: one set for every region: HM01 Cut, HM02 Fly, HM03 Surf, HM04
  Strength, HM05 Flash, HM06 Whirlpool, HM07 Waterfall, HM08 Rock Smash,
  HM09 Dive, HM10 Defog, HM11 Rock Climb.
- **Field moves** (`game/field-moves.js`): FireRed's seven, Flash, Cut, Fly,
  Strength, Surf, Rock Smash and Waterfall, each with the Gym Badge FireRed asks
  for (Boulder, Cascade, Thunder, Rainbow, Soul, Marsh, Volcano). A Pokémon can
  use one if it knows the move, or if you have the HM in the Bag and it could
  learn the move from it, so nothing has to give up a move slot. Dig and Teleport
  (no HM: a Pokémon that knows them) are there too: Dig out of a cave as an Escape
  Rope takes you, Teleport from wherever Fly could go back outside the last
  Pokémon Center you were in (where blacking out would take you). On the party
  screen a Pokémon's menu lists every one of them it knows or could learn, in
  FireRed's blue, with FireRed's line about it ("Travel on water.") while it's
  chosen (more than fit scroll). Picking one says why not ("This can't be used
  until a new Badge is obtained.", "You need HM03 Surf to use Surf.", "No
  surfing here!", "There's nothing to Cut.") or uses it: Cut a tree in front of
  you, Flash in a dark cave (`requires_flash`: dark but for a circle around you,
  which opens up), Fly from outdoors to any town you've been to (the Town Map,
  each place marked with FireRed's blinking wing icon; you land outside its Pokémon Center, FireRed's heal
  locations, and Route 4's Center counts once you've been in; no buttons under the map: A flies, B goes back, SELECT or R
  changes region) with FireRed's
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
  HeartGold and SoulSilver's TMs with no machine here are TM108–TM113 (Dragon Pulse,
  Natural Gift, Captivate, Stealth Rock, Brine, Avalanche: `tools/build-johto.js`,
  numbering them from TM108). TM114–TM165 are every other TM of Red, Blue and
  Yellow, Gold, Silver and Crystal, and HeartGold and SoulSilver whose move had no
  machine here, in those games' order: Mega Punch, Razor Wind, Whirlwind, Mega
  Kick, Horn Drill, Body Slam, Take Down, Double-Edge, Bubble Beam, Water Gun, Pay
  Day, Submission, Counter, Seismic Toss, Rage, Mega Drain, Dragon Rage, Fissure,
  Teleport, Mimic, Bide, Metronome, Self-Destruct, Egg Bomb, Swift, Skull Bash,
  Soft-Boiled, Sky Attack, Psywave, Tri Attack (Red, Blue and Yellow's, TM114–TM143);
  Dynamic Punch, Headbutt, Curse, Rollout, Zap Cannon, Sweet Scent, Snore, Icy
  Wind, Endure, Dragon Breath, Mud-Slap, Ice Punch, Defense Curl, Thunder Punch,
  Detect, Fire Punch, Fury Cutter, Nightmare (Gold, Silver and Crystal's,
  TM144–TM161); Drain Punch, Silver Wind, Recycle, Pluck (HeartGold and SoulSilver's,
  TM162–TM165). FireRed and LeafGreen's are all here already. None of TM114–TM165
  is found anywhere yet. TM166–TM347 are every other main game's TMs (and HMs) whose
  move had no machine here, by game and in each game's own order
  (`node tools/build-later-tms.js <PokeAPI csv folder>`, from PokeAPI's `machines.csv`):
  Black and White and Black 2 and White 2's three (Telekinesis, Ally Switch, Work Up,
  TM166–TM168), Sun and Moon and Ultra Sun and Ultra Moon's four (Leech Life, Brutal
  Swing, Smart Strike, Aurora Veil), Brilliant Diamond and Shining Pearl's two (Bug Buzz,
  Nasty Plot), Sword and Shield's 97, their TRs as TMs (Pin Missile to Body Press,
  TM175–TM271), Scarlet and Violet's 58 with The Teal Mask's and The Indigo Disk's (Acid
  Spray to Upper Hand, TM272–TM329) and Legends: Z-A's 18 with Mega Dimension's (Night
  Slash to Sheer Cold, TM330–TM347). Ruby, Sapphire and Emerald's, Diamond, Pearl and
  Platinum's, X and Y's and Omega Ruby and Alpha Sapphire's were all here already, and
  Legends: Arceus has no machines. None of them is found anywhere yet either (the debug
  menu's every-TM gift has them). Who can use them: any species that learnt the move by
  machine in some generation (@pkmn/dex, as below); Legends: Z-A's moves that were never
  a machine before (Comet Punch, Sing, Sheer Cold, Fake Out...), any species that learns
  the move some way in some generation.
  Compatibility comes from the Gen 6
  learnsets; for HMs and for machines Gen 6 never had (Bullet Seed, Water
  Pulse, Shock Wave and the later ones), also from
  any generation that taught the move by machine, Red, Blue and Yellow's and Gold, Silver and
  Crystal's included (`data/machine-learners.js`,
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
| `tools/` | Data generators (`npm run build:evolutions`, `npm run build:item-sprites`, `npm run build:maps`, `npm run build:intro`, `npm run build:battle-bgs`, `npm run build:machine-learners`, `npm run build:sprite-metrics`, `node tools/build-slot-machine.js pokefirered` for the Game Corner slot machine graphics, `node tools/build-voltorb-flip.js pokeheartgold` for Voltorb Flip's) and their shared PNG/GBA/text helpers (`tools/lib/`) |
| `assets/sprites/` | Pokémon sprites (front, back, shiny), item icons, trainer and overworld sprites |
| `assets/tilesets/` | FireRed's tilesets (tiles, palettes, metatiles), the source for the maps |
| `assets/world/` | Generated map images and transparent overworld sprites |
| `assets/intro/` | Generated opening movie, title screen and Oak's speech graphics |
| `assets/battle/` | Generated battle backgrounds (FireRed's battle terrains) |
| `tests/` | Loads every non-UI script and checks formulas, engine regressions, progression rules and AI choices, plus 200 random battles, 120 random double battles and 100 random battles each of Gen 7, Gen 8 and Gen 9 teams; `tests/browser/lib.js` is a Playwright helper for checking things in the real page (it serves the game, loads a save made in Node, and presses keys long enough to register); `tests/browser/johto-story.js` plays Johto's story in the page from Elm's Lab to Azalea (16 beats, one save the whole way: `node tests/browser/johto-story.js [first] [last]`, resuming from the save after the beat before) |

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

Future Sight and Doom Desire are foreseen when used ("…foresaw an attack!")
and land at the end of the turn after next on whoever is in that place then
(from the Pokémon that used them, even if it has left; through Protect; Dark
types immune to Future Sight; one at a time on a place). Last Resort fails
until the user has used each of its other moves since it came in (and it
needs at least one other).

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
