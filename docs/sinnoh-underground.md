# Sinnoh Underground

Use the Explorer Kit in a Sinnoh town, city or route to go below ground. It
returns you to the place you entered when you choose **Go Up**. Water tiles, Safari games
and Amity Square cannot be interrupted this way. Existing mining areas outside
Sinnoh retain their rules.

Six connected 2D tunnel sectors provide mining walls, traders, 32 local explorer
contacts and access to your Secret Base. The sector layouts are authored for the
browser game, rather than copied DS matrices. The source Underground's wireless
players are represented by explicitly offline explorer quests: contacts restore
the Hallowed Tower, and repeatable daily route-memory challenges award returned
flags. This implementation does not provide DS wireless, record mixing or live
player bases.

## Imported data

The importer reads all 70 obtainable mining object variants, their shapes and
four weight columns from `src/underground/mining.c`: odd/even Trainer ID, before
and after the National Dex. Skull/Armor Fossil exclusivity, post-Dex fossils,
plates, shards, Heart Scales, evolution stones and Odd Keystones follow those
weights. Ten small/large Sphere variants retain their five types. The wall uses
the existing 13×10 digging interface, with bedrock enabled, Pickaxe/Hammer from
the beginning, two to four objects, and a fixed energy budget. Rock depth,
energy/crack handling and the controls are explicit adaptations of the shared
mining game. Sphere size uses the source base/large/remaining-wall bonuses with
that energy budget as wall integrity. Mining XP is still earned; it does not
change this region's treasure availability.

The 132 non-PC/non-boulder goods definitions retain source names, dimensions,
collision masks, National Dex flags, Sphere prices and cash prices from
`src/goods.c`. Goods have newly drawn 2D representations. Daily traders sell
seven goods and seven traps with stable source-range prices. Veilstone also
sells the source cash-priced decorations. The 26 priced trap definitions and
names come from the source tables/text. Event trophies remain available for
other feature groups to award through the same goods registry.

## Inventories and Secret Base

Spheres, treasures and goods stay in separate Underground inventories with the
source 40-slot limits; the base PC holds 200 goods. Transfer treasures into the
normal Bag before using or reviving them. Trading consumes one complete Sphere,
and full inventories/cancellation do not charge. Sphere size caps at 99; up to
100 can be buried. Burying in front of you combines matching types with the
source larger + floor(smaller/5) + 1 formula. Different types cannot share a
spot. Growth uses the source per-type daily ranges on the walking clock and is
stable on reload. Retrieve a Sphere from an adjacent tile.

Use a Digger Drill while facing a solid wall to establish or move your base.
Moving returns placed goods to the PC and requires room. The Underground menu
enters the base; its exit returns to the sector where you entered. The PC opens
a keyboard/touch layout editor. Dimensions, overlap, boulders, bounds and an
open central access aisle are checked. Returned flags retain the source ranks
at 1/3/10/50, boulder counts 16/15/11/6/0, and placement caps 10/12/15/15/15.

Traps can be bought, placed ahead, retrieved nearby, or triggered by walking
onto them. Sixteen may be placed. The DS touchscreen/microphone/forced-motion
escape effects are adapted to local tap/direction escape controls; their source
names, inventory, prices and single-use triggering remain intact. Alert,
movement, confusion, smoke, rock, bubble, foliage and fire families all use this
accessible escape interface.

The Eterna mentor's nine stages reward the source traps, Spheres, Digger Drill,
four starter furnishings, starter doll and four gems. Source flag challenges
use the local explorers described above. The Route 208 gift provides an Odd
Keystone; inserting it into Route 209's Hallowed Tower and meeting 32 local
explorers permits the source level-25 Spiritomb fight. Losses/fleeing retain the
attempt; a win/capture resets the stone and contacts for another restoration.

Validation covers source weight columns, fossil parity, bedrock and tools,
separate inventory limits, growth/merging, atomic trading, cash decorations,
base access and placement, flags, traps, mentor rewards, Spiritomb retries and
six-sector navigation. A native browser test drives the Bag's Explorer Kit,
a mining wall and separate treasure reward, decoration editor, explorer flag
challenge, Keystone insertion, a real Spiritomb battle and saved inventory.
