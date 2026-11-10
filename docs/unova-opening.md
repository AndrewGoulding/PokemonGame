# Unova opening: Black 2 / White 2

The playable Unova campaign currently runs from Aspertia City through **Elesa’s
Bolt Badge**. Talk to the regional travel researcher in Sinnoh’s Fight Area
(24,27); the researcher near Aspertia’s southern entrance returns you there.
The next [Castelia chapter](unova-castelia.md) includes the studio, chase, ferry,
sewers and third Gym. Your existing party, storage, money and other regions’
progress are preserved.
Unova has its own Badges and obedience limits. Store extra party members at a
local Pokémon Center before collecting a starter if your party is full.

## Playable content

- Aspertia’s home, school, outdoor Gym and Center; Route 19; Floccesy Town,
  Alder’s house, Route 20, Floccesy Ranch and its back pastures; Virbank’s gate,
  city, Gym, Complex and its inner worksite, with three working Centers: 19 maps.
- Bianca gives Snivy, Tepig or Oshawott, followed by the matching Hugh battle.
  Route 19 provides catching advice and ten Poké Balls. Hugh’s Ranch rematch,
  the lost Herdier and the fleeing Plasma grunt lead to Alder’s two lessons.
- Both Gym students precede Cheren; both band members precede Roxie. Their
  source teams, rewards and reusable Work Up/Venoshock machines are imported.
  Route 20’s Hiker opens the road east after the Basic Badge. The Complex’s
  foreman and three worker battles award the Rock Smash machine.
- Source encounter tables include all four seasons, Black 2 / White 2 variants,
  dark grass, rustling grass, Surf and Super Rod slots for the opening areas.
  Dark grass can produce native double battles; rustling grass appears after
  the Basic Badge. Seasons change every 30 saved game days.
- Mr. Medal gives the Medal Box after Alder’s lessons. First Step and walking
  medals are earned and saved. All 255 source medal names/thresholds
  are imported, but the other medal conditions are not implemented yet.
- After Cheren, Bianca gives the C-Gear and Return machine. Use the C-Gear or
  Medal Box from the Bag, or open the regional Trainer Card from the Start menu.
  These adapted panels show Badges, obedience limit, local records and places
  visited; the C-Gear switches the encounter version between Black 2 and White 2.
- Local nurses, source Badge-based shops, PC storage, healing, visited-town Fly
  destinations and regional blackout recovery use
  the shared game systems. Gen 5 field moves do not require Badges here, while
  the shared move compatibility and machine requirements still apply.

## Reference and adaptation

Data comes from [fuddlesworth/pokebw2](https://github.com/fuddlesworth/pokebw2),
commit `588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`. The generated file records
that revision and the paths of the trainer, encounter, learnset, dialogue and
medal sources. The opening imported 39 trainer records (including deferred later rematches),
427 dialogue records and eight encounter banks. The Castelia expansion raises
these totals to 65 trainers, 662 dialogue records and 15 encounter banks.

NPC sheets, trainer portraits, Medal Box art and the C-Gear background are
exported from the source assets. Shop upgrades count only Unova Badges. Maps are
authored 2D layouts with native collision and warps; they are not a DS
matrix/model renderer. Outdoor art now uses the same FireRed terrain tiles and
native building stamps as the shared Johto renderer, including roof layers and
animated water/flowers. Paths and building footprints are compact, with gardens,
groves and furnished interiors. Existing door anchors stay fixed; older saves on
newly blocked scenery recover to nearby open ground. Music currently uses
existing game tracks. Shared battles retain the project’s battle rules; the
imported teams, wild moves and starters use their Gen 5 source moves. Dialogue
and events are adapted to the browser interface. The C-Gear does not provide DS
wireless/online services, and its regional itinerary is not a full Unova
graphical Town Map. The regional Trainer Card is not the complete native BW2
card/stars system. No BW1 story coverage is implied by this opening.

## Rebuilding and checking

With a local checkout of the reference revision (no ROM needed for this builder):

```sh
npm run build:unova -- /path/to/pokebw2
node tests/unova-test.js
npm test
```

Python 3, Pillow and the reference repository’s `tools/data/nitro_cells.py` are
needed to render trainer classes that only have DS cell animations. Other art
uses the project’s PNG utilities. `tests/browser/unova.js` drives real battles
through both Gyms, the opening quests, device controls and saved reloads.
`tests/browser/unova-services.js` checks workers, Bag use, blackout/nurses and
grass battles; `tests/browser/unova-shop.js` checks purchases and PC withdrawal.
`tests/browser/unova-maps.js` checks refreshed scenery, roof/animation loading,
physical doorway entrances/returns and saved reloads.

Remaining campaign and feature work is tracked in
[the Unova checklist](unova-completion.md). The playable campaign currently continues through Elesa; the northern road and deeper
Relic Passage remain closed.
