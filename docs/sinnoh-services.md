# Sinnoh town services and Game Corner

`tools/lib/platinum-services.js` imports Platinum's lottery prizes, massage
accessory range/names, twelve compatible ultimate-move starters and all nineteen
Veilstone Coin prizes. It resolves source TMs by their taught move: for example,
Platinum TM58 becomes this project's Endure machine, not its numbered TM58.
Rooms and placements are explicit 2D adaptations; original script paths are
retained in the generated provenance.

Dawn's sister unlocks daily swarm reports after regional research certification.
The TV counter repeats the same saved announcement. A source bank is selected
once per walking-clock day; slots 0 and 1 on its mapped locations use that
bank's source swarm species while retaining their encounter levels. North/south
map pieces of the same source bank share the announcement. Reloading does not
reroll the day's swarm.

Jubilife's daily lottery checks the trailing digits of Trainer IDs on Pokémon
in both the party and PC, including traded Pokémon. The ticket is stable for
the game day and can be checked once. Full Bag prizes remain collectable.

| Matching digits | Platinum prize |
| --- | --- |
| 1 | Ultra Ball |
| 2 | PP Up |
| 3 | Exp. Share |
| 4 | Max Revive |
| 5 | Master Ball |

Veilstone's daily massage raises friendship by three and supplies one of the
sixteen source accessories from Pretty Dewdrop through Glitter Powder, up to
nine copies of each. Julia gives the correct weekday ribbon; Dr. Footstep gives
the Footprint Ribbon at 255 friendship. The Ribbon Syndicate requires ten
**different ribbon types across the party**, matching `CountPartyRibbons`, then
keeps membership. Hoenn contest ranks, Super Contest ranks and Orre's National
Ribbon count alongside other ribbons. Its luxury ribbons cost ₽10,000,
₽100,000 and ₽999,999 in order. The independent daily spa gives +30 friendship
5% of the time, +10 for the next 25%, otherwise +5. Sinnoh League winners now
receive the Champion Ribbon; matching existing Hall of Fame Pokémon migrate
without giving unrelated Pokémon a ribbon.

Wilma teaches Draco Meteor to a Dragon-type Pokémon with complete friendship,
including Plate typing where applicable. The Route 228 tutor teaches the source
twelve fully evolved starters Frenzy Plant, Blast Burn or Hydro Cannon at the
same friendship requirement. Learning uses the native move replacement UI.
Veilstone's four meteorites change Deoxys's form while preserving its identity,
held item, nickname and moves. The Name Rater respects original ownership,
the Move Deleter retains at least one move, and the Hidden Power reader uses
the engine's IV calculation. Policemen battle at night and Joggers in the
morning; their sight checks, dialogue and Pokétch listing follow the clock.

The Game Corner buys 50 Coins for ₽1,000 or 500 for ₽10,000. Sinnoh's case holds
50,000 Coins in a separate saved balance, preserving the existing Kanto/Johto
balance and 9,999-Coin model. The Bag's Coin Case reports the regional balance.
Six cabinets play the shared, functional GBA slot-machine minigame: this is an
explicit 2D gameplay adaptation, not an implementation of Platinum's DS reel
program. All source held-item/TM prizes and prices are available. Reusable TMs
are not sold again to a player who already owns them. Purchases and prizes
handle refusal, insufficient funds, case limits and Bag limits atomically.

Validation covers source tables, all five lottery tiers and PC IDs, saved
swarms/wild replacement, massage/day limits/accessory bounds, ribbon membership,
special tutoring, Deoxys identity preservation, name/deletion restrictions,
trainer hours and independent Coin balances. Browser scripts exercise the
lottery, swarm, massage, ribbons, tutor, Deoxys and actual slot entry/exit.
