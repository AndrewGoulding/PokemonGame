# Regional boutiques

Every region outside Kalos now has a clothing boutique, open from the start. Each sells its own authored line,
named after the region's towns, through the same shop and wardrobe as the Kalos boutiques and the team outfitters.
Kalos keeps its six X/Y boutiques.

| Boutique | Where | Pieces |
| --- | --- | --- |
| Celadon Boutique | Celadon Department Store 2F (Kanto) | 12 |
| Goldenrod Boutique | Goldenrod Department Store 2F (Johto) | 12 |
| Lilycove Boutique | Lilycove Department Store 2F (Hoenn) | 10 |
| Veilstone Boutique | Veilstone Mart (Sinnoh) | 12 |
| Mall Nine Boutique | Shopping Mall Nine (Unova) | 12 |
| Gateon Outfitters | Gateon Port Mart (Orre) | 9 |
| Hau’oli Apparel | Hau’oli City (Alola) | 13 |
| Motostoke Boutique | Motostoke (Galar) | 11 |

Each line covers hats, tops, pants or skirts (and dresses in some regions), shoes and bags for both clothing
collections, with socks or tights in most. Prices run from ¥900 (socks) to ¥8,400 (dresses), and stock is the same
every day. Pieces are authored, not from any game's catalogue; their names choose the wardrobe art's existing
patterns (Plaid, Knit, Camo, Boots, Skirt and so on), so they draw on the player's sprites like the X/Y pieces.
Buying here doesn't add Kalos style points, and a boutique only sells its own line.

Talk to the clerk and choose **Browse clothes** to preview, buy and wear, or **Change clothes** for the shared
wardrobe. Clerks take a free spot that keeps every entrance connected, like the team outfitters.

Implementation: the `boutiques` table in `game/team-fashion.js`, which feeds the shared vendor, stock and art paths.
Tests: `tests/region-boutiques-test.js` (placement, both collections, shop isolation, prices, distinct art, saves)
and `tests/browser/region-boutiques.js` (buying and wearing at Celadon through native input, then opening every other
boutique).
