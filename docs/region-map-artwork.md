# Regional overworld artwork

The seven custom regions now use a layered art pipeline. Kanto, Johto and Hoenn
remain the unchanged visual reference for detail, recognizability and clear
collision boundaries.

## How the layers work

- **Orre, Sinnoh, Unova, Kalos:** Keep their committed 2D map pictures from
  the source/build pipelines. Regional atmosphere and civic inlays can add
  light, noninteractive details without replacing their map PNGs.
- **Alola, Galar, Paldea:** Keep their independent field geometry and existing
  background painters. The region terrain-detail layer handles connected
  cliffs, grass and shorelines.
- **All seven regions:** `assets/region-art/` holds editable, original pixel-art
  SVG scenery. `ui/authored-region-art.js` assigns those images to named
  landmarks and places them *only on already-blocked contiguous rectangles*.
  One landscape's image is never substituted for a story event or doorway.

Each SVG has a 96 × 64 viewBox, crisp pixel edges, and no external fonts,
scripts, links or images. At runtime the browser scales it to the safe tile
footprint (usually 2–6 tiles wide and 2–4 tiles high). Art is loaded lazily,
cached and drawn below the player/NPC sprites.

## Main art families

| Region | Authored scenery |
|---|---|
| Orre | Phenac fountain terraces; Pyrite windmill |
| Sinnoh | Snowy shrine; flower-garden cottage |
| Unova | Nimbasa Ferris wheel; urban skyline |
| Kalos | Lumiose café; vine-covered garden architecture |
| Alola | Thatched village, palms, ruins, Aether facility, volcanic rock, League, hotel |
| Galar | Cottage, railway station, industrial skyline, stadium, mushroom wood, castle, dojo, shrine |
| Paldea | Adobe town, academy, arena, Levincia lighting, windmill, Kitakami roofs, crystalline terrain |


## Second hand-authored location pass

The following **22 additional original 96×64 SVG assets** are now editable separately
instead of borrowing an all-purpose region sprite. Most are assigned to named
locations in `ui/authored-region-art.js`:

| Region | Specific new designs |
|---|---|
| Orre | Agate Village's great tree, Mt. Battle gantry, Realgam Tower dome |
| Sinnoh | Spear Pillar ruins, Canalave's bridge, Eterna Forest architecture |
| Unova | Driftveil harbor crane, Opelucid's towers, Skyarrow Bridge (asset prepared, placement deferred) |
| Kalos | Tower of Mastery, Geosenge monoliths, Snowbelle chalet |
| Alola | Seafolk Village's boat, Malie pagoda, Po Town hideout |
| Galar | Ballonlea's luminous mushrooms, Turffield geoglyph, Wyndon's clocktower |
| Paldea | Cascarrafa water terraces, Glaseado summit, Area Zero laboratory, Kitakami shrine |

These are source artwork files, not screenshots or merely shader effects.
Their visible placement still depends on an existing collision-safe footprint.
Some locations may need a hand-adjusted layout to display the entire structure
at full size. The existing 2D maps, scripts, reciprocal warps and encounter
geometry remain authoritative.

## Editing a specific place

1. Find its map key in `WORLD_MAPS` and its existing anchors (warps,
   people, signs, triggers, hidden items, Fly and Center destinations).
2. Draw or edit an SVG in `assets/region-art/` with the shared 96 × 64
   coordinate system; keep the artwork crisp at 16-pixel map scale.
3. Set the map's asset ID in `CHOICES` in `ui/authored-region-art.js`.
   Asset placement uses a collision-only rectangular footprint and avoids a
   one-tile area around scripted objects.
4. Prefer updating the original map generator for major geometry changes.
   **Do not relocate entrances, NPCs or existing save positions to make a
   picture fit.** A null placement means that the map needs a deliberate,
   reviewed layout change rather than hiding a working corridor.
5. Test the change:
   `node tests/authored-region-art-test.js`,
   `node tests/browser/authored-region-art.js` (requires Playwright), and
   `npm test`. Verify the game is still navigable and the artifact does not
   obscure any on-screen events.

## Completion standard

An individual map should have a recognizable environment, clear passable
terrain and entrances, visual correspondence between a wall and its
collision, appropriate landmarks, no concealed NPCs or triggers, intact
reciprocal warps, stable save loading and a browser screenshot inspection.

**Coverage limitation:** These sprite additions are a substantial art pass,
not a claim that every route, city, cave and interior in all seven regions
has been individually repainted. Unlisted rooms retain their existing
artwork. For source-quality parity, further individual map-layout and
PNG-level work is still required.
