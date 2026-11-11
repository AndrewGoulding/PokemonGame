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
first chapter. Ula’ula and Poni Islands, Aether Foundation's later chapters,
Ultra Necrozma, League and postgame remain future implementation.
Existing Gen VII species, moves and Z-Move systems are reused; this slice does
not claim full Z-Power/Rotom Dex/ride integration. Both versions will remain
merged rather than becoming separate routes or version selections.

Test: `node tests/alola-test.js`. The general test suite includes this file.

The merged Totem sequence uses Gumshoos and Alolan Raticate, with Alolan
Rattata and Alolan Meowth represented by their actual Generation VII forms.

## Akala Island chapter

The single Ultra Alola campaign continues from Hala's Melemele Grand Trial.
Board the ferry at Hau’oli City's harbor, then meet Hau in Heahea City.
The return ferry in Heahea saves the current Akala position and remembers the
separate island Pokémon Center, without resetting Melemele or other regions.

The chapter adds **24 connected Akala maps** (39 Alola maps total): Heahea
City, Tide Song Hotel, Route 4, Paniola Town and Ranch, Route 5, Brooklet
Hill's entrance, hill and Totem Pool, Route 6, Royal Avenue and Battle Royal
Dome, Route 7, Wela Volcano, Route 8, Lush Jungle, Konikoni City, Memorial
Hill and Ruins of Life. Three new Pokémon Centers heal and set local respawns.
The map graph has reciprocal warps; existing Melemele warp indices stay intact.

Playable story, in order:

- Heahea arrival and Hau battle, plus Ultra Recon Squad/Necrozma introduction
- Paniola Hau rematch, ranch healing and Route 5 Gladion confrontation
- Lana's two Brooklet Hill splashes, Totem Araquanid with Masquerain,
  and Waterium Z
- Route 6 Team Skull and a Battle Royal Dome **single-trainer exhibition**
  (the original four-way Battle Royal format is *not* claimed as implemented)
- Kiawe's two dance fights, Totem Alolan Marowak with Salazzle, and Firium Z
- Ultra Recon Squad battle on Route 8; Mallow's four ingredient locations,
  Totem Lurantis and Castform, and Grassium Z
- Olivia's invitation in Konikoni, Plumeria at Memorial Hill, then Olivia's
  three-Pokémon Grand Trial at Ruins of Life, awarding Rockium Z

Battles use the existing native battle engine and preserve retryable boss
progress when a reward is blocked by Bag capacity. Special battles use
single/trainer-battle adaptations in place of the original cinematic, ally
and multi-trainer presentation. The island uses authored level ranges, wild
pools and existing Gen VII sprites/moves; it does not yet reproduce the full
Ultra Sun/Ultra Moon encounter databases or 3DS map geometry.

Akala completion raises the Alola level cap progressively and leaves the
campaign at its next milestone: Ula’ula Island. Subsequent islands, the
full Ride Pager, Aether Foundation climax, Ultra Necrozma, League and postgame
remain unfinished. No Ultra Sun/Ultra Moon version selection is introduced.

Akala regression tests: `node tests/alola-akala-test.js` and the native
Playwright flow `node tests/browser/alola-akala.js` (requires Chromium and
Playwright). The Playwright flow is not included in `npm test`.

## Regional Town Map
The Town Map now opens on **Alola** when the player is on Melemele or Akala,
shows the correct current location (including indoor maps), and can switch
between visited regions. A single shared map covers both Ultra versions, with
an original schematic island illustration rather than a 3DS screenshot.
Fly destinations at Iki Town, Hau’oli City, Heahea City, Paniola Town and
Konikoni City unlock only after visiting those towns; return maps and story
progress are unchanged. Regression: `node tests/alola-town-map-test.js`.
