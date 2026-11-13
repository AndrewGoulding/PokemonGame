# Decorations: Ruby, Sapphire, Emerald and Omega Ruby/Alpha Sapphire

Every decoration from the Hoenn games can now be bought or earned in the game:
Emerald's 120 (which include the three e-Reader dolls) and the 52 that Omega
Ruby and Alpha Sapphire added, redrawn as 2D tiles.

![The Omega Ruby and Alpha Sapphire decorations](oras-decorations-preview.png)

## What was wrong before

Only about 27 of Emerald's 120 decorations could be obtained, because every
Hoenn shop had lost its stock. A shop's list in Emerald's scripts ends with a
macro, and the script converter read such a list as a script and dropped its
entries. That emptied the decoration counters and the ordinary Poké Marts
alike. `tools/build-hoenn-marts.js` reads the lists from a pret/pokeemerald
checkout and writes them to `data/hoenn-marts.js` (37 lists, 326 entries).

## Where each decoration comes from

Emerald's are where Emerald has them: Fortree's decoration shop (desks and
chairs), the Pretty Petal Flower Shop (plants), Slateport's market (bricks,
balloons, note mats, three dolls), Lilycove Department Store 5F (dolls,
cushions, posters, mats) and its rooftop sale, the Battle Frontier's exchange
corner, the Game Corner, the Trick House, the Glass Workshop, Lanette, Scott
and the Lilycove Museum.

This game's own changes:

- **The four Emerald decorations nothing gave** (the Seedot Doll, which was
  Ruby's, and the e-Reader's Regirock, Regice and Registeel Dolls) are sold
  with the dolls on Lilycove 5F.
- **The rooftop clear-out sale is always on.** In Emerald it ran only while
  Lilycove was on the TV news.
- **The Omega Ruby and Alpha Sapphire decorations** are added to the same
  counters: gadgets and the Icy Desk at Fortree's desk clerk, other furnishings
  at Fortree's chair clerk (ORAS's Secret Base Guild is in Fortree), mats,
  wall pieces and the two new dolls on Lilycove 5F, and the sale goods on the
  rooftop.
- **You can own more.** Each category's limit was raised to hold both sets.

## Honest limits

- **Names are ORAS's English ones; the rest is this game's.** The list was
  first taken from a German reference (Pokéwiki's "Super-Geheimbasis/
  Deko-Objekte") and translated, which got 28 of the 52 names wrong. They
  were then matched, description by description, against Serebii's English
  ORAS decoration list, which has 51 of them; the Welcome Mat is not on that
  list and its name comes from Bulbapedia's Generation VI list. Neither was
  checked against the game's own text, so a spelling could still differ.
  Sizes, pictures, descriptions and the prices of pieces ORAS only gave as
  gifts are this game's own, so a picture need not look like ORAS's piece
  (the Makiwara is drawn as a hanging bag, the Paradoxical Popper as endless
  stairs, the Invisible Doll can be seen).
- **Keys kept the old names.** A decoration's key (`OLD_LAMP` for the
  Worn-Out Light, `GREEN_PUSH_PANEL` for the Yellow Spin Panel, and so on)
  is what a save holds, so the keys were left as they were when the names
  were corrected.
- **They are ornaments only.** Warp panels, spin panels, the pitfall mat, the
  jukebox, the vending machine and the rest are for show; they do nothing when
  stepped on or used.
- **Everything is bought.** Pieces ORAS handed out for Secret Base Guild rank,
  Contests or showing a Pokédex are simply sold instead.
- ORAS's single Fence is covered by Emerald's two fence pieces.

## Regenerating

```sh
node tools/build-hoenn-marts.js <path to pret/pokeemerald>
node tools/build-oras-decor.js
```

`tools/build-oras-decor.js` needs no source checkout. It draws each piece,
packs the tiles into `assets/world/maps/_decor_oras-mt.png` and writes
`data/oras-decor.js`, which adds the catalogue entries after Emerald's (ids
121 on) and the shop stock. To add a decoration, add a row to `LIST` (or
`DOLLS`) and name a shop for it in `SHOPS`; the build fails if a piece is sold
nowhere.
