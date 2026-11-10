# Unova trainer item inventories

The 110 imported trainer records with item inventories now use their finite
stock in battle. This includes ten source item types: Potions, Super/Hyper/Max
Potions, Full Restores, Full Heals and four X items. Normal and Challenge trainer
IDs resolve their own source inventories. Other regions and competitive battles
keep their existing behavior.

The policy uses ordinary engine item actions, so an item consumes the trainer's
turn, displays the normal message and updates HP, status or boosts. It restores
low HP or a missing amount large enough for a finite-dose healing item, cures
applicable status/confusion, and considers X items only on a Pokémon's first
active turn. This is an adaptation using the existing battle AI, not an import
of the original DS item-decision routine.

Inventory use is derived from executed opponent item events. Asking the AI for
a choice does not spend an item. Rejected/unexecuted choices cannot spend stock;
player items and held-item activations do not spend the opponent's stock. Each
new battle has fresh inventory, and the imported records and player's Bag remain
unchanged. Replacements never trigger a healing action for a fainted Pokémon.

All current source inventory users are singles trainers. The policy delegates
multi-active formats to the existing AI, and facilities disable these Bag
choices. Tests enforce that no current item-bearing trainer is silently excluded
by that format restriction.

Validation includes actual engine healing/status/confusion/boost actions and a
native Cheren battle: his single source Potion heals 20 HP exactly once while
the player carries no Potions.
