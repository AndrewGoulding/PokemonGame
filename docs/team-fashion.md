# Regional team clothing

Former team members sell cosmetic uniforms once their local storyline is resolved. There is no duplicate Rocket vendor in Johto.

| Team | Vendor location | Unlock |
| --- | --- | --- |
| Rocket | Kanto Rocket Hideout B1F | Beat Giovanni at Silph Co.; the earlier hideout battle does not qualify |
| Aqua | Aqua Hideout 1F | Resolve the Sootopolis crisis and see Archie and Maxie leave |
| Magma | Magma Hideout 1F | Resolve the Sootopolis crisis and see Archie and Maxie leave |
| Galactic | Galactic HQ 1F | Resolve Giratina's Distortion World encounter after Cyrus |
| Plasma | Original BW Cold Storage | Complete the original BW Ghetsis battle |
| Neo Plasma | BW2 Plasma Frigate | Defeat BW2 Ghetsis |
| Flare | Lysandre Labs | Stop Lysandre and leave the destroyed headquarters |
| Cipher | Realgam Tower 1F | Defeat Evice |
| Snagem | Snagem Hideout | Defeat Gonzap at Realgam Tower |

Each vendor sells a hat (¥2,500), top (¥5,000), pants or skirt (¥3,500), boots (¥2,500), and bag (¥2,000), in both clothing collections. A complete set costs ¥15,500. Stock is available every weekday after unlocking. The two Unova campaign flags are independent.

The 90 authored uniform pieces supplement the canonical 307-piece X/Y catalogue. Uniforms use team colors and small letter emblems on the existing protagonist's pixel layers. They are cosmetic interpretations, with no disguise mechanics or battle bonuses. Wes retains his own appearance.

Outfitters serve as the [regional boutiques](region-boutiques.md) do: **Buy** opens FireRed's Mart buy screen with the uniform for the collection you're wearing (one of each piece, shown on you before you buy, and put on as you leave if you like), **Wardrobe** opens the shared wardrobe. Ownership, equipment and named outfits use the existing save format and work without starting Kalos. Vendors occupy free floor space away from entrances, signs and triggers, without blocking a corridor.

The same module also runs the [regional boutiques](region-boutiques.md).

Implementation: `game/team-fashion.js`, the shared fashion model/device, and story-event dispatch. Run `npm test` for story gates, placement, purchases, collection rendering and persistence. `tests/browser/team-fashion.js` buys and wears at the Rocket vendor's Mart screen through native input, reloads the save, and opens every other outfitter's.
