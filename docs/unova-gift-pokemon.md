# Eevee, Happiny and source gift Pokémon

Fennel's Castelia lab and the Nacrene–Route 3 gate are now playable source rooms.
The gate is inserted into the existing road with reciprocal warp indices; the
old city and route warp positions remain valid. Lab and gate residents use their
source sprites and dialogue.

After the Unova Hall of Fame, Amanita gives one male Eevee at level 10 with
Anticipation. It is shiny locked, uses the source level-up moves, and records the
player's OT and current Unova version. The Day-Care breeder in the Nacrene gate
gives one Happiny Egg with Pound and Charm. It has forty ordinary Egg cycles and
is not counted as a caught Happiny before hatching. Both gifts require a free
party slot; canceling, a full party and repeat visits preserve the correct state.

References: `castelia_city_30.s` uses `PokePartyAddEx` with species 133, level 10,
hidden ability 3, male sex 0, non-shiny mode 0 and Poké Ball 4.
`nacrene_gate.s` uses `PokePartyAddEgg` for species 440. Source learnsets are
imported from their respective `res/pokemon/*/data.json` files.

The party-add opcode audit covers nine source script banks, also including
starters, N's Zorua, Benga's shinies, fossil revival, Join Avenue, Magikarp and
the Route 6 Deerling. This does not turn unavailable network services into
implemented features.

Village Bridge reward IDs are now read directly from source: item 157 is Lum
Berry (three for Honey Gather), item 158 is Sitrus Berry (five for the practice
secret). Honey Gather requires the Hall of Fame after Chris's battle. Earlier
Persim/Lum awards and completed flags remain intact. Each affected quest delivers
its corrected berries once, with atomic full-Bag retry; fresh claims store the
new reward revision and receive no correction bonus. Completed Honey Gather
quests no longer demand that the player keep the ability in their party.
