# Town plans

One file per region (`kalos.js`, `unova.js`, `alola.js`, `galar.js`, `paldea.js`). Each exports
`{ MapName: plan }`, where a plan is `{ theme: {...}, plan(p) {...} }`. `tools/build-region-layouts.js`
runs the plan for that map and then finishes the map as usual (buildings on doors, roads to any gate
the plan left unconnected, grass, trees, reachability repair).

**Fixed:** every warp (door or gate), person, sign and the tile in front of each door stay where they
are. See them with `node tools/plan-preview.js anchors <Map>`. Everything else is yours to design.
Coordinates are tiles, x right, y down, (0,0) top-left.

## `theme`

Overrides for the map's theme. The useful keys:

- `ground`, `road`, `border`: tile kinds (see below). `water`: `"water"`, `"sea"` or `"bog"`.
- `density` (0-1, scattered trees/rocks in unplanned ground; 0 for none), `groves` (0-1), `flowers` (0-1),
  `tree` (the scatter stamp: `tree1`, `honeyTree`, `boulder`, `hedge`, `barrels`), `treeTint` (`frost`, `autumn`, `dark`).
- `autoHouses: false` stops the generator adding houses of its own (do this when you place `decor` houses).
- `house`, `center`, `gym`, `mart`, `big`: lists of stamp names tried on doors of that kind.
- `width` (generated road width), `turn`/`wander` (how straight generated roads run).

A plan switches off the generic landmarks (fountain, Ferris wheel, runway and so on); draw your own.

## `plan(p)`

- `p.W`, `p.H`, `p.warps` (`{k, x, y, to, door}`), `p.people`.
- `p.fill(kind, x0, y0, x1, y1)` and `p.disc(kind, cx, cy, r[, ry])`: ground of that kind.
  - A walkable tile kind: `grass meadow field lawn paving asphalt brick ornate cobble sand beach desert dirt gravel clay snow drift deck marsh flowersRed flowersBlue flowersPink steel darkpave neon ash frost autumn shade runway`.
  - `"water"`: makes water (never over a kept tile). A street drawn across it becomes a plank bridge or pier.
  - A solid kind: `tree rock pine palms darktree autumntree ashrock` (or `"border"` for the theme's border).
  - `"ground"`: back to plain theme ground (also opens the border on the map's rim).
- `p.street(kind, width, [[x, y], [x, y], ...])`: a street through those points. Straight segments read best.
- `p.building(k, stamp, { tint })`: which building stands on warp `k`'s door. It is placed with its door on the warp,
  so it needs free tiles above and beside the door; if it does not fit the builder says so and falls back.
- `p.bare(k)`: the generator draws nothing on warp `k` (no building, arch, cave mouth or arrow). Use it when you
  draw that entrance yourself with `p.paint`.
- `p.decor(stamp, x, y, { tint, walk, canopy })`: a building or prop with no way in, top-left at (x, y).
  It may not cover a kept tile. `canopy: true` puts all but the bottom two rows on the walk-behind layer (trees, towers).
- `p.paint(z, (c, top) => { ... })` with `p.block(x, y, w, h)`: draw a landmark by hand in pixels (16 per tile) with the
  canvas primitives `c.rect/box/line/ellipse/poly/p`; things drawn on `top` are walked behind. `z` is the tile row it sorts at.
- `p.roof(r, g, b)` recolours a `gable`/`peak` roof, `p.trim(r, g, b)` a tower's red trim; pass as `tint`.

Stamps (name: width x height in tiles, door column): see `STAMPS` in `tools/lib/city-stamps.js`.
Buildings with doors: `gable 4x6`, `peak 4x6`, `logHouse 6x6`, `cabin 5x5`, `flat 6x5`, `pcSmall 5x4`, `hearthCenter 7x6`,
`centerRed 7x6`, `centerBlue 5x5`, `snowCenter 5x5`, `martSmall 5x4`, `mart 5x5`, `snowMart 5x5`, `gym 7x5`, `oreGym 7x5`,
`snowGym 7x5`, `lab 8x5`, `church 8x8`, `hall 11x8`, `whiteHall 12x7`, `works 7x7`, `factory 13x13`, `academy 10x8`,
`studio 9x10`, `temple 10x7`, `lighthouse 3x7`, `towerDoor 5x9`, `towerDoor2 5x9`, `dishTower 9x16`.
Without doors (decor only): `apartment 3x6`, `towerSlim 4x14`, `towerShort 4x9`, `brickTall 4x10`, `brickFlat 5x7`.
Props: `fountain 3x4`, `twinFountain 4x4`, `parkFountain 9x5`, `bench 1x2`, `hedge 1x1`, `bush 1x1`, `barrels 1x2`,
`barrel 1x1`, `tree1 2x3`, `honeyTree 2x3`, `boulder 2x3`, `board 1x1`.

## Rooms (interiors, Gyms, League rooms)

Indoor maps of Alola, Galar and Paldea are built as a walled room: floor from row `p.top` to `p.bottom`, columns
`p.left`..`p.right`, a two-row wall above `p.top`, darkness outside. A plan for one replaces the default furniture.
`p.room` is `true` in a room plan.

- `theme`: `room` (`center mart house lab arena hall shrine`), `floor` (any walkable tile kind; room floors are
  `rCenter rMart rHouse rLab rGym hallFloor ruinFloor caveFloor`), `wall` (`wCenter wMart wHouse wLab wGym`, or `null`
  for plain stone), `top` / `bottom` (floor rows), `court: true` to keep the generic lined court under your plan.
- `p.fill(kind, x0, y0, x1, y1)` / `p.disc(...)`: floor of that tile kind (also outside the default rectangle, to
  shape the room). `"void"` is darkness, `"wall"` a stone wall block, `"water"` a pool (not walkable).
- `p.decor(stamp, x, y, { optional })`: furniture; rows above `p.top` hang on the wall. It must stand on free floor.
  Room stamps: `rDesk 7x4` (healing desk; its top two rows are wall), `rPC 1x2`, `rBooks 2x2`, `rPlant 1x2`,
  `rSeats 3x3`, `rFridge 2x2`, `rGoods 2x2`, `rAisle 2x2`, `rKitchen 3x3`, `rTV 2x2`, `rTable 5x4`, `rPot 1x2`,
  `rWindow 2x2`, `rMachine 3x4`, `rShelf 2x3`, `rBench 4x2`, `rLabTable 4x2`, `rStack 2x3`, `rStatue 2x3`; outdoor
  props (`boulder`, `tree1`, `hedge`, `barrels`, `fountain`...) work too.
- `p.paint(z, (c, top) => ...)`, `p.block(x, y, w, h)`, `p.bare(k)` (no doormat/doorway drawn on warp `k`), `p.hue`
  (a colour picked for this room), `p.warps` (`exit: true` on the way out), `p.people`.

Caves and trial sites (rock caverns) are outdoor-style maps: plan them with the town calls above; their theme is
`cavern` (ground `caveFloor`, walls `caveVoid`).

## Checking

```sh
node tools/build-region-layouts.js '^GalarHulbury$'     # builds just that map's picture; errors name the tile
node tools/plan-preview.js picture /tmp/x.png GalarHulbury
```

The build fails if a plan walls in a door, person or landing, and reports any wall it had to open.
