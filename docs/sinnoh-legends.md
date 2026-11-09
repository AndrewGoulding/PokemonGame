# Sinnoh legendary stories and postgame rematches

This milestone extends the campaign and four side-quest chains. The combined
Platinum import now contains 1,604 messages and 352 trainer records. See the
[completion checklist](sinnoh-completion.md) for feature groups still pending;
Sinnoh is not yet declared complete and Unova has not started.

## Regional research and offline events

Oak in Rowan's Sandgem lab certifies your research after becoming Sinnoh
Champion and seeing all 210 species in Platinum's regional Pokédex. Forms count
as their underlying species. Celestic's paintings register Dialga and Palkia;
a book on Route 212 registers Manaphy. The shared cross-region Pokédex remains
available throughout the game; this is a Sinnoh-specific research milestone.

The deliveryman in Jubilife's Mart provides offline event parcels. Eterna's
rescue makes the Platinum Secret Key available. The Member Card, Oak's Letter
and Azure Flute become available after research certification. The original
Cinnabar Secret Key is a different item and retains its original behavior.
The counter also offers a Manaphy Egg and the level 100 TRU Regigigas event gift,
with refusal/full-party retries. Eggs are registered as caught when hatched.
These are local access adaptations: there is no external distribution service.
The Azure Flute story was present but unreleased in retail Platinum.

## Legendary expeditions

- **Cresselia**: enter Eldritch's marked house in Canalave and speak to his
  sleeping child. Eldritch then sails to Fullmoon Island. Approach Cresselia,
  collect the Lunar Wing it leaves behind and return it to the child. Cresselia
  roams Sinnoh at level 50 with saved identity, HP, PP and status.
- **Darkrai**: after curing the child, bring the Member Card to the Harbor Inn
  attendant in Canalave. The dream leads to level 50 Darkrai.
- **Shaymin**: bring Oak's Letter to Oak on Route 224, choose an expression of
  gratitude and follow the path to Flower Paradise. The fateful encounter is
  level 30. Floaroma's flower giver provides Gracidea when shown Shaymin. Use it
  from the Bag on unfrozen Land Forme Shaymin during the day. It reverts at
  night, in storage, or when frozen; freezing changes it during battle as well.
- **Arceus**: bring the Azure Flute to the northern end of Spear Pillar. The
  shining stairway leads to level 80 Arceus. Plates change its field display
  and battle typing; Judgment uses the Plate's type. Typed display art and
  shiny palettes are imported from Platinum, with the Psychic palette as the
  display fallback for the later-generation Fairy type.
- **Dialga and Palkia**: use Waterfall to reach the reliquary from Mt. Coronet's
  adapted junction and collect the Adamant/Lustrous Orbs. The corresponding
  Spear Pillar portals lead to Platinum's level 70 encounters.
- **Regigigas**: the guide by Snowpoint Temple leads to its sanctuary. Bring
  Regirock, Regice and Registeel together to awaken level 1 Regigigas.
- **The three Regis**: guides on Iron Island, Route 216 and Route 228 lead to
  Registeel, Regice and Regirock. Bring Regigigas, walk on all seven floor marks,
  then approach the statue for the level 30 encounter. As an access adaptation,
  any Regigigas qualifies, including the offline event gift.
- **Turnback Cave**: enter from the Spring Path guide. Read three pillars within
  thirty rooms using the shifting exits. The saved procedural path is an
  adaptation of Platinum's room selection. Reaching the sanctuary awards a
  Reaper Cloth, Rare Bone or Stardust based on rooms used. Giratina is level 47
  and will not duplicate a Giratina already caught in the main story. The
  Griseous Orb is available in the sanctuary; holding it changes Giratina into
  Origin Forme, while the Distortion World also forces that form.
- **The birds**: after certification, visit Oak at Pal Park, then in Eterna.
  He gives an Up-Grade and releases Articuno, Zapdos and Moltres at level 60.
  Their battle records persist between encounters. Route-map tracking and
  automatic fleeing are tracked separately on the completion checklist.

Losses and escapes permit retries. Defeated uncaught legendaries return after
another Sinnoh League victory; caught ones stay completed. Event gifts, visited
locations, puzzle stages and roaming battle state survive save/reload. Research
certification is the common access gate for these adapted postgame expeditions.
The rooms and transport are 2D adaptations, not imported DS models or bytecode.

## Rotom and rematches

The Platinum Secret Key opens Looker's annex beside Eterna's Galactic building.
The five appliances grant Heat/Wash/Frost/Fan/Mow forms and their signature moves;
Normal form removes the appliance move. A full moveset opens the native move
replacement screen. Cancelling leaves the form and moves untouched.

The marked Battleground in Survival Area opens after Charon's arrest. Four
eligible guests rotate daily using the walking clock; source Gyms and escorted
partners use their imported rematch parties. Each guest can be beaten once a
day, with losses allowing retries. Barry's Fight Area challenge is available
on Saturdays and Sundays with the party corresponding to your chosen starter.

The Elite Four and Cynthia switch to their stronger source teams after Charon's
arrest, including Cynthia's level 78 Garchomp. Existing gauntlet ordering,
loss/leave resets, healing rules and Hall of Fame recording remain in effect.

## Validation and regeneration

```sh
node tools/build-platinum.js /path/to/pret/pokeplatinum
npm test
node tests/browser/sinnoh-legends.js
```

The importer also regenerates sprite metrics for the newly imported Arceus
palettes. Automated tests cover source levels/moves, research, event gift retries,
regional item isolation, all quest gates, saved roaming state, the Regi puzzles,
Turnback limits/rewards, full-moveset cancellation, Gracidea/held-item forms,
Judgment's typing, frozen Shaymin, rematch schedules and map/actor access.
The browser suite exercises the certification and gifts, Cresselia/Lunar Wing,
Darkrai, the appliance room, Gracidea through the Bag and the native Regi marks.
