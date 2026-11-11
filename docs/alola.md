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

## Akala optional investigation
A police officer in Heahea City offers an optional **Ditto Five** investigation.
Five disguised residents on Route 4, in Paniola Town, Royal Avenue, Route 8,
and Konikoni City each reveal a Ditto battle. The five encounters can be
completed in any order, retry after a loss and persist through save/reload.
Reporting all five to the officer awards three Rare Candies once.

## Ula’ula Island chapter (merged Ultra Sun / Ultra Moon)

The campaign continues from Olivia’s completed Akala grand trial. The ferry
attendant in Konikoni City sails to **Malie City**; the return ferry in Malie
preserves the current Ula’ula map and separately tracks the island’s healing
point. All existing Akala progress and other regional saves remain shared.

**23 connected new maps (62 Alola maps total)** include Malie City, its
Pokémon Center and garden, Routes 10–17, Mount Hokulani and its Observatory,
Blush Mountain, Tapu Village and Center, the abandoned Thrifty Megamart,
Aether House, Ula’ula Meadow, Po Town, Shady House, Haina Desert, and the
Ruins of Abundance.

Story progression: Hau in Malie City, Team Skull on Route 10, Sophocles’s
three-switch Observatory trial and Totem Togedemaru (Electrium Z), Hapu on
Route 12, Acerola’s three ghost photographs and Totem Mimikyu (Ghostium Z),
Aether House defense, Plumeria, the Po Town gate, Guzma in Shady House,
and Kahuna Nanu’s grand trial (Darkium Z). Save flags and battle rewards are
retry-safe; level caps increase to 60/65/70 through the chapter.

The Alola Town Map now depicts all three implemented islands schematically
and supports Malie and Tapu Village as additional visited-only Fly spots.
Temporary Kalos backgrounds are still used for overworld layouts. The
Aether Foundation climax, Lusamine, Poni, Ultra Necrozma, League, and
postgame remain future chapters; Tapu Bulu’s ruins are exploratory only.

Regression: `node tests/alola-ulaula-test.js` (also included in `npm test`).

## Aether Paradise and Poni Island (unified Ultra Sun/Ultra Moon)

After Nanu’s grand trial, sail from Malie City to Aether Paradise. Defeat the guards and Lusamine, then sail to Seafolk Village on Poni Island. Each ferry retains a separate resume point and healing location within the existing Alola save.

**19 connected maps (81 Alola maps total)** include Aether Paradise Dock, Lobby and Laboratory, Seafolk Village and Pokémon Center, Poni Wilds, Ancient Poni Path, Poni Breaker Coast, Ruins of Hope, Poni Grove, Poni Plains, Poni Meadow, Resolution Cave, Vast Poni Canyon, Dragon Trial, Altar of Sunne/Moone, Ultra Space and Poni Gauntlet.

The story includes Hapu’s grand trial (Groundium Z), Totem Kommo-o (Dragonium Z), Ultra Necrozma, and Mina’s petal trial with Totem Ribombee (Fairium Z). The cap rises progressively to 75, 80, 85 and 90. Z-Crystal rewards and progress are save-safe. Seafolk Village gains a Town Map Fly spot.

The layouts reuse existing 2D templates and boss battles are native adaptations. The Pokémon League, Tapu guardians, Rainbow Rocket and postgame remain unfinished. Regression: `node tests/alola-poni-test.js`.

## Mount Lanakila, Alola League and postgame

After Mina's trial, a ferry guide in Seafolk Village opens **Mount Lanakila**.
Hau challenges the player on the mountain before entry into the newly founded
**Alola Pokémon League**. The player registers in the lobby, then defeats
the Elite Four in order: **Molayne (Steel), Olivia (Rock), Acerola (Ghost),
and Kahili (Flying)**. Hau is the merged Ultra Sun/Ultra Moon Champion
challenger. Winning records the Champion title and unlocks a Hall of Fame
scene, a one-time Rare Candy gift and optional title defenses. Re-entering
the League through the registration NPC resets only the current Elite Four
challenge flags; prior Champion titles, island trials and save data persist.

The expansion adds **19 connected maps**, bringing the shared Alola campaign
to **100 maps**: Mount Lanakila base, Center, slopes, cave and summit,
League lobby and recovery room, the four Elite Four chambers, Champion room,
Hall of Fame, postgame expedition hub, Battle Tree, Rainbow Rocket base,
laboratory and boss room, plus an Ultra Beast research station. The Seafolk
and Aether ferries preserve separate League and postgame resume positions.
The Town Map shows these destinations, with League and postgame Fly spots
unlocking once the player visits those locations. Postgame lifts the
Alola level cap to 100.

**Postgame activities:** a repeatable native Battle Tree trainer-battle
streak with a recorded best score and milestone rewards; the Team Rainbow
Rocket sequence of Archie, Maxie, Cyrus, Ghetsis, Lysandre and Giovanni;
seven one-time Ultra Beast research battles; optional battles against all
four Tapu guardians; and battles with both Solgaleo and Lunala in the same
merged campaign. NPC events save and guard their completion flags.
No version selection is introduced.

**Scope:** These are authored 2D/native battle-engine adaptations, not
3DS maps, a faithful four-way battle format, literal cutscenes, the complete
USUM postgame script, or guaranteed catchable Ultra Beast/Tapu encounters.
The Hall of Fame celebration is dialogue/state based rather than the full
cinematic. This implementation completes an initial playable League and
postgame chapter without claiming parity with the full original games.

Regression: `node tests/alola-league-test.js`, added to `npm test`.
