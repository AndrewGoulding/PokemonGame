# Unova houses, gatehouses and side streets

`tools/lib/unova-houses.js` adds the remaining Black 2 / White 2 houses, upstairs
rooms, gatehouses and Castelia side streets. It runs after every other Unova
module has bound its event banks, then follows the source warps
(`res/field/events/<bank>.json`) outward from the mapped banks until nothing new is
reached. A bank becomes a room only when a source warp leads to it from a mapped
area, so legacy, cutscene-only and wireless zones are never guessed into the map.
The pass adds 130 rooms: 103 houses (including upstairs floors), 20 gatehouses and
7 outdoor side streets (Castelia’s streets and Rumination Field).

| Area | Rooms |
| --- | --- |
| Aspertia, Accumula, Nuvema | three two-floor houses each (Nuvema two) |
| Floccesy, Virbank | two and three houses |
| Castelia | six side streets, six office buildings, the café and the Feeling Reader |
| Nacrene | four houses, Café Warehouse, Burgh’s old warehouse, the museum library and its upstairs |
| Striaton, Nimbasa | three and two houses, Battle Test house |
| Driftveil, Mistralton, Icirrus | four, two and three houses, Icirrus Pokémon Fan Club |
| Lentimas, Lacunosa | the move recommender and a house, three houses |
| Opelucid | five two-floor houses |
| Humilau, Black City, White Forest | four, two and one houses |
| Routes 4–7, 11, 13, 15, 18, 23 | 20 route houses, two Route 4 upstairs floors and the Poké Transfer Lab |
| Abundant Shrine, League, Victory Road | the shrine house and two rest houses |

The gatehouses sit on the road between their two areas: Accumula–Route 2,
Pinwheel Forest–Skyarrow Bridge, Skyarrow Bridge–Castelia, both Tubeline Bridge
gates, both Village Bridge gates, both Marvelous Bridge gates, Undella and Humilau
to the Marine Tube, Driftveil–PWT, Nimbasa to Routes 5 and 16, Opelucid to Routes 9
and 11, the Desert Resort gate, Route 1–Route 17, Route 13–Undella and
Virbank–Pokéstar Studios. Each existing warp pair is split through the gate, so
both directions pass through it and no route is lost. The source banks of the five
existing native gates (Aspertia, Virbank, Castelia’s Route 4 gate and both version
gateways) are bound to those maps and gain their source people.

## Layout

Doors are projected from the parent bank’s source warp position onto the authored
town or route, like the existing interiors. A house uses the nearest clear 5×5
footprint that stays off the roads and leaves every existing warp exactly as
connected as before; upstairs floors and street corners use a plain warp tile.
People and signs are projected from their source grid into the room.

## People, signs and rewards

Every source person without a hide flag who has a sprite and a message speaks the
first message of their source script (348 people). Signs with source text read it
(75 signs). Item balls, trainers and hidden items keep using the shared field and
trainer passes; no house bank has a field item.

One-time gifts come from the source give-item calls (`global_2800` with its flag
and before/after/done messages, and `global_2805`/`2806` followed by their own
`FlagSet`). 24 gifts are imported. Each is keyed by its source flag, so the two
Route 4 Sitrus Berry houses (shared flag 386) pay once. Rewards go through the
native capacity-safe gift path: a full Bag leaves the gift unclaimed. The Route 13
Mail Pokémon gives the Power Lens in White 2 and the Power Band in Black 2, the
Aspertia upstairs fortune teller requires the Basic Badge, and TMs are translated
by move like the field TMs. Balm Mushroom and Favored Mail use their source item
data and icons. Six resting houses on Routes 4, 6, 7, 18 and 23 heal the party.
The existing Accumula, Route 4, Route 7 and Route 15 trade NPCs move into their
source houses.

Gifts whose source conditions need systems this pass does not reproduce stay as
dialogue only and are listed in `interiors.houses.unsupported` (16): the starter
quiz, Pokédex-count rewards, the Mienfoo walk, the Fan Club friendship check, the
weekday café drinks, party-count checks, random gallery/feather gifts, the TM move
quiz, the Castelia sunglasses search and the Aspertia gate type check. The Nacrene fossil choice and Castelia
Harlequin Hunt are already native (`bw:lenora-fossil`, `bw:harlequin-hunt`), so
those source people are not duplicated.

## TVs, trash cans and vending machines

These are not script events in the source but tile classes of each room's map model
(`res/field/maps/models/<model>/terrain_*.csv`, found through the zone's matrix): TV
0xd8, trash cans 0xdd/0xde and vending machines 0xe2, which `src/ov036/fieldmap_event.c`
sends to `global_10530`, `global_2500` and `global_10400`. Each connected run of one
class is one fixture, projected into the room like the people. The Driftveil–PWT gate's
two machines are background events calling `global_10400` and are placed the same way.
The pass adds 43 TVs, 94 trash cans and 9 vending machines to 99 rooms (`interiors.houses.fixtures`).

- TV: pick CELEBRITY, BATTLE or VARIETY, watch one programme picked as
  `Scrcmd_PokeDisp_TVGenProgramMsgID` does (Interview Unova, with the player's half of
  the idol chats; Moves for Living; the horoscope), then maybe a commercial (20%, then
  10% for the rest of the viewing), then “Keep watching?”. Lines that need a met
  Join Avenue idol take the source's not-met branch. Each programme adds record 23.
- Trash can: “The trash can is empty.” and record 43.
- Vending machine: Fresh Water ₽200, Soda Pop ₽300, Lemonade ₽350 until you cancel or
  run out of money; a full stack of that drink stops the sale. Each drink adds record 125;
  one in 32 drops a bonus drink while there is room, for the Lucky Drink Medal.

The counters begin with the Medal Box, like Unova's other action records.

## Not imported

`interiors.houses.skipped` records each reached bank that stays out, with its
reason: native maps (home, Trainer School, Day Care, Undella villa, former Plasma
shelter, Passerby Analytics HQ, Join Avenue, Gear Station platforms, stadiums,
Musical Theater, Pokéstar sets, Pledge Grove, Black Tower and White Treehollow),
League chamber signs, ferries, and banks no source warp reaches from a mapped area
(cutscene rooms, Unity Tower, Battle Subway cars, the Entralink copies and others).
Pokémon Centers and Gyms keep their native rooms.

Validation: `tests/unova-interiors-test.js` checks the 130 rooms, two-way warps
for every door and gate, gate placement on the Nimbasa–Route 5 road, one actor per
imported person/sign, relocated trades, gift items/flags, Bag-full retry, shared
flags, badge and version gates, custom items, the native scene, healing, signs and
saves. The browser map walk enters and leaves every new door.
