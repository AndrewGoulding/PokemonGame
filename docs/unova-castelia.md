# Unova: Pokéstar Studios through Burgh

This chapter extends the Black 2 / White 2 campaign from Roxie to the **Insect
Badge**. Continue from Virbank: visit Pokéstar Studios through the northern
exit or speak to the studio guide, film at the soundstage, then release your
successful take at the theater. Meet Plasma near the harbor, follow the chase
to Route 20, and return to the captain to sail to Castelia. The ferry returns
to Virbank whenever needed.

In Castelia, Iris points toward the sewer entrance by the second pier. Speak
to Hugh inside, defeat the two grunts together and receive Strength. Burgh
then returns to his Gym. Defeat each gallery's Harlequin and interact with its
silk cocoon to reach the next gallery, then Burgh's chamber. The three-gallery
route is a room-based adaptation of BW2's animated cocoon transport. The
Insect Badge raises this project's regional level cap to 30 and awards the
reusable Struggle Bug machine.

## Included content

- Twenty new maps: studio grounds, theater and soundstage; Castelia and its
  Center; five sewer chambers, the secluded garden and early Relic Passage;
  three silk galleries and Burgh's chamber; Medal Office, Analytics HQ and
  two Battle Company floors. The Unova total is 39 maps.
- Source Normal Mode teams for Burgh, the three Gym Harlequins, early sewer and Relic
  Passage trainers, Doctor Heath, Battle Company employees, two chase grunts,
  two sewer grunts and all three matching Hugh partner teams. There are now
  65 trainer records, including deferred later encounters, and 662 imported
  dialogue records.
- The first Brycen-Man movie uses the source Lv. 13 Riolu rental, Expert Belt,
  Force Palm and Ice Punch against Lv. 15 Pawniard and Lv. 13 Vullaby. Source
  natures, individual IVs and EVs are adapted to the shared stat calculator.
  A good ending requires a win in the source two-turn limit. Rehearsals are
  free and repeatable; bad takes do not open the harbor story.
- The movie runs as an isolated native battle: it never swaps the player's
  party or uses their items, money or experience. A successful take stores a
  local battle recording. The theater releases it and can replay it. The
  enemy follows its first listed move as browser rehearsal direction; this is
  not the full DS movie scripting engine or film catalog.
- Hugh joins battles in all five sewer chambers, including wild doubles,
  and heals the player's party after surviving battles. The Plasma encounter
  uses the shared native multi-battle interface and the source Hugh back art.
  Outside the sewers he does not join battles. The shared tag interface lets
  the player select up to three party members for the scripted multi battle.
- The Harlequin Hunt gives the Bicycle, tracks the three offices and awards
  a Rare Candy. The Battle Company provides the shared Exp. Share, Scope
  Lens, five employee/president battles and the source two-Quick-Ball/two-Timer-Ball
  rewards. The Exp. Share retains this project's shared behavior.
- Source garden encounters include Eevee and Black 2 / White 2 exclusives.
  All five sewer banks and the first Relic Passage bank bring the imported
  Unova encounter total to 15. Surf and fishing tables remain available where
  applicable. Sewer geometry keeps permanent water channels with walkways;
  the DS seasonal water-level geometry is not implemented in this chapter.

## Source and scope

Reference revision: `588c0b937229f5c5cb7abad9bf8070dd2c7d97eb` of
[fuddlesworth/pokebw2](https://github.com/fuddlesworth/pokebw2).
The generated `UNOVA_DATA.source.events` records event/script/text/encounter
paths. Movie data comes from `res/pokewood/movies/0/{movie,cast}.json`;
trainer data and portraits come from `res/trainers`, with field actors from
`res/field/actors`. Hugh's back art comes from
`res/trainers/sprites/back/pkmn_trainer_rival`.

Maps retain the shared FireRed tile style, native collision, roof layers and
water animation. Castelia's piers and avenues, sewer bridges, separate silk
galleries and stage/theater scenery are authored 2D adaptations. Existing
regions and the original Unova door anchors retain their saves and progress.
Music uses existing game tracks. This milestone does not include Route 4,
Colress's battle, the desert, Nimbasa, the remaining film catalog or BW1's
separate campaign. The deeper Relic Passage connection remains closed until
its later chapter is imported.

## Validation

`tests/unova-test.js` checks the map network (including ferry travel), physical
floor connectivity, approaches, trainer moves and source assets.
`tests/unova-castelia-test.js` checks all three starter paths through the
chapter, a real two-turn rental battle, failed/cancelled takes, film release,
replay calls, ferry gates and returns, Hugh teams and wild doubles, losses and
retries, cocoon prerequisites, Burgh's reward/cap, capacity-safe optional gifts
and reloads. `tests/browser/unova-castelia.js` drives the native movie, recorded
screening, chase, sailing, multi battle, Gym, Hunt and saved reload.
