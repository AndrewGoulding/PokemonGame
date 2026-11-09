# Poffins and Contest conditions

Platinum supplies all 64 Berry flavor/smoothness records, 29 Poffin names and
palettes, 25 nature preferences, ten shop recipes and the Mild Poffin gift.
`tools/lib/platinum-poffins.js` imports these from the Berry item JSON, Poffin
source, feeding app and field scripts. Poffin sprites are decoded from the
source `poruact.narc`; the mixing pot and batter use the source cooking textures.
The Poffin House is an adapted 2D room in Hearthome.

Get the Poffin Case from the existing Fan Club gift. Cooking accepts one Berry
for a solo recipe or up to four from your Bag for an explicitly offline batch.
A batch returns each contributor's share to this one player: one Poffin per
ingredient. It does not simulate a wireless connection. The touchscreen/mouse
pot and A/B stirring controls run a 24-second, three-heat-stage minigame, with
changing direction, selectable speed, burns and spills. Controller focus also
supports ingredient selection and Case management.

The source recipe arithmetic is retained: adjacent flavor subtraction,
negative-flavor penalty, cooking-time multiplier and rounding, burn/spill
penalties, duplicate-ingredient Foul Poffins, cooperation smoothness reduction
and a smoothness floor of fifteen. The shorter 2D game translates stirring
quality into an effective source cooking time; it is not the DS timing/physics
engine. Foul, Rich, Overripe, Mild, single- and dual-flavor types follow the
source thresholds. Case capacity is 100, including batch output. Ingredients
are reserved atomically; cancelling or recovering a saved interrupted recipe
returns them without duplication. Entry/result checkpoints protect the recipe.

The Poffin Case opens from the Bag or the House helper. It previews flavors,
level and smoothness; filters by flavor; sorts by level or smoothness; shows
party condition bars; feeds or discards one selected Poffin. Nature increases
its liked flavor by 10% and decreases the disliked one by 10%, truncating as the
source does. Conditions and Sheen cap at 255, a full Pokémon cannot eat, and
feeding raises friendship by one. Conditions use the existing `record.contest`
fields, so Hoenn and Sinnoh share the same underlying training.

Veilstone's vendor sells the source ten Level-32 two-flavor recipes, smoothness
20, for ₽6,400 each. Hearthome's Rich Boy gives the source Level-60 Mild Poffin
(60/30/30/30/30, smoothness 40) once. Full Cases, insufficient money and cancelled
choices do not charge or consume a gift. With Beauty at least 170, Feebas can
evolve on level-up; its existing Prism Scale trade evolution remains available.
The evolution data builder now emits both rules.

Validation covers source recipe values and rounding, type selection, duplicate
recipes, Case limits, ingredient reservation/refunds, batch quantities, shop
pricing, gift limits, nature multipliers, Sheen, friendship, save data and both
Feebas evolution methods. The browser test drives ingredient selection, real
stirring inputs, Case use through the Bag, filters/sorting, feeding/condition
bars, the vendor and gift, and an interrupted-recipe reload.
