# Ultra Alola — unified Ultra Sun / Ultra Moon campaign
The region uses **one campaign** in `flags.alola`, with no version selector.
The goal is to combine Ultra Sun and Ultra Moon content, including both versions'
exclusive Pokémon and optional quests, in one continuous playthrough. Original
Sun and Moon are **not** separate campaigns.

## Implemented opening slice
- Access through a new researcher in Sinnoh's Fight Area; return from Hau’oli
  Outskirts with separate resume and healing locations.
- Fifteen connected Alola maps: home, outskirts, Route 1, Iki Town, Mahalo
  Trail, Pokémon Center and Trainer School.
- Rowlet, Litten or Popplio gift with party-capacity guard, Pokédex credit and
  persistent campaign flags; Hau uses the starter weak to the player's choice.
- Hau's first battle, Lillie/Nebby's bridge rescue, festival rematch, four
  Trainer School pupils and teacher challenge.
- Wild encounter pools on Route 1 and Mahalo Trail; shared party, Pokédex,
  PC, inventory and money, but separate story state.
- Saved progress and level caps. The Pokémon Center heals and sets an Alola
  respawn point. Other regions' flags are not reset.

## Temporary art and limits
Map layouts and backgrounds are borrowed from existing Kalos 2D maps as
**placeholders**, not claimed to match actual Alola geography or Nintendo's
3DS geometry. Dialogue, trainer rosters and encounter tables are initial
authored adaptations rather than complete Ultra Sun/Moon script/ROM imports.
Hau’oli Beach, Hau’oli City, Route 2, Berry Fields, cemetery, Verdant Cavern,
Ilima's captain battle, Team Skull battles, three dens, both Ultra Sun and Ultra
Moon Totem Pokémon, Normalium Z, and Hala's Melemele grand trial now extend the
first chapter. Akala and the other islands, Ultra Recon Squad, Aether Foundation,
Ultra Necrozma, League and postgame remain future implementation.
Existing Gen VII species, moves and Z-Move systems are reused; this slice does
not claim full Z-Power/Rotom Dex/ride integration. Both versions will remain
merged rather than becoming separate routes or version selections.

Test: `node tests/alola-test.js`. The general test suite includes this file.

The merged Totem sequence uses Gumshoos and Alolan Raticate, with Alolan
Rattata and Alolan Meowth represented by their actual Generation VII forms.
