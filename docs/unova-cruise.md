# Royal Unova

The Royal Unova is a playable offline sidequest reached from Castelia’s western
pier after the Unova Hall of Fame. It adds a ticket office, a ship corridor,
fifteen searchable cabins and an observation deck in the shared 2D map style.
The native ticket, walking, NPC dialogue, Trainer battles and disembarkation
flow use the ordinary game controls. The steward reports the source port,
starboard and blue-door Trainer counts.

Provenance: pokebw2 commit `588c0b937229f5c5cb7abad9bf8070dd2c7d97eb`,
`src/ov089/pleasure_boat_rooms.c`, `src/ov036/pleasure_boat.c`,
`src/system/rtc.c`, and `royal_unova.s` / `castelia_city_11.s` with their text.
All ten postgame Trainer teams, ten early teams, fifteen single passengers,
five passenger pairs, passenger dialogue, side/door groups and weekday counts
come from those tables. The current BW2 cruise uses the postgame teams. Both
tables are retained; the low-level teams do not replace the postgame teams.
Sunday has seven Trainers; Monday through Saturday have 4/3/4/5/4/6.

Tickets cost ₽1,000 and one departure is available each game day. Seasonal
hours follow the source evening periods: spring/autumn 17:00–20:00, summer
19:00–21:00, winter 17:00–19:00. These use the project’s existing walking clock
and thirty-day seasons. The room and Trainer draws are seeded and saved, so
reloading preserves the cabin assignments, victories and cruise clock.

The DS cruise uses four periods of 1,350 field frames. This 2D adaptation uses
one 30-unit clock tick per walking step, giving 180 walking steps. Menus and
battles pause the clock. Single passengers apply the source ten-step advance,
stopping just before a period boundary; pairs advance to the next period.
The on-screen counter shows the remaining steps. This is a walking challenge,
not a claim to emulate the DS real-time renderer or cruise animation.

Defeating every Trainer earns the source weekday prize: Rare Candy Sunday,
Lava Cookie Monday/Wednesday/Friday, Berry Juice Tuesday, Old Gateau Thursday,
and RageCandyBar Saturday. Leaving early or timing out returns to the pier
without a completion prize. Losing ends the local cruise and restores health
through the existing no-blackout flow. A full Bag preserves the pending prize
for collection at the ticket office; another cruise cannot overwrite it.
Actual paid departures increment Cruise Connoisseur, including unfinished
cruises, as source record 126 does. Cancelling or failed payment does not count.

The model test covers 140 seeded weekday rosters, source pools/levels, seasonal
hours, atomic payment and party checks, saved state, clock penalties/timeouts,
victories and repeat guards, prizes and Bag retries, the ten-cruise Medal and
scene dispatch. The general Unova topology test traverses the complete Unova map graph and
checks connected entrances and NPC approaches. The browser test boards through
the native UI, talks to a passenger, reloads a saved cruise, plays Tuesday’s
three source battles, claims its prize and verifies the daily limit and save.
