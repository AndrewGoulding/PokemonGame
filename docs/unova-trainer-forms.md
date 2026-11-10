# Source trainer forms

Trainer imports now honor Basculin's stripe, Wormadam's cloak and Rotom's
appliance form, including form-specific level-up moves. This corrects Ace
Trainer Enzio, Fisherman Andrew and Veteran Oriana; Colress's Wash Rotom
now uses the shared importer instead of a ship-specific correction.

Blue-Striped Basculin also has its source front/back sprites, shiny palettes,
icon, abilities, learnset and shared Basculin cry. Source encounter tables
now retain blue stripes instead of falling back to the red-striped base.
Existing red-striped Basculin saves remain valid.

Source: `res/trainers/data/*.json`, `res/pokemon/*/form_*.json` and the
corresponding sprite directories in the pinned pokebw2 checkout.
