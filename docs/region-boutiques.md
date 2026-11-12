# Regional boutiques

Every region outside Kalos now has a clothing boutique, open from the start. Each sells its own authored line,
named after the region's towns, through the same shop and wardrobe as the Kalos boutiques and the team outfitters.
Kalos keeps its six X/Y boutiques.

| Boutique | Where | Pieces |
| --- | --- | --- |
| Celadon Boutique | Its own building in Celadon City, west of the Pokémon Center (Kanto) | 12 |
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

The Celadon Boutique has a building of its own: the awning-fronted shop on Celadon's main street, in the row of
houses between the Celadon Mansion and the Pokémon Center (its shop window reads as its sign). Its clerk stands
behind the counter and serves as a Poké Mart does: **Buy** opens FireRed's Mart buy screen with the line for the
collection you're wearing, one of each piece (a piece you own shows `-----`), an icon in the piece's colour, and
a fitting window that shows you in the piece under the cursor before you buy. Leaving the screen, she offers to
put on what you bought. **Wardrobe** opens the shared wardrobe; **See ya!** leaves. The other boutiques work as below.

Talk to the clerk and choose **Browse clothes** to preview, buy and wear, or **Change clothes** for the shared
wardrobe. Clerks take a free spot that keeps every entrance connected, like the team outfitters.

Implementation: the `boutiques` table in `game/team-fashion.js`, which feeds the shared vendor, stock and art paths.
The Celadon Boutique's building, room and door are built by `tools/build-celadon-boutique.js` (into
`data/celadon-boutique.js` and `assets/world/maps/CeladonCity-patch-boutique*.png`, `CeladonCity_Boutique*.png`);
its Mart screen stock, icons and previews are `ui/boutique-mart.js`, opened by `boutiqueMart` in `ui/game.js`.
Tests: `tests/region-boutiques-test.js` (placement, both collections, shop isolation, prices, distinct art, saves)
and `tests/browser/region-boutiques.js` (in at the Celadon Boutique's door, buying on the Mart screen and wearing through native input, then opening every other
boutique).
