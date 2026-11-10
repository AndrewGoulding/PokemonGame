# Join Avenue development

The development assistant south of the original manager expands Join Avenue to
eight shop plots. Existing starter-Avenue shops migrate with their earned ranks;
the original four-shop introduction continues to work until development begins.

All eight source families are available: Raffle Shop, Beauty Salon, Market,
Flower Shop, Dojo, Nursery, Antique Shop and Café. Recruitment chooses a vacant
plot, family and Black/White/Black 2/White 2 stock variant. The Nursery requires
Avenue rank 15. Eight local visitors can be referred daily. Their preferences and
referral awards are an offline adaptation with source weekday shop bonuses.
Source popularity thresholds raise the Avenue to rank 100 and shops to rank 10.

The import contains all 320 source shop rows, 331 goods and 67 raffle tables from
`res/join_avenue`, with names and descriptions from `global_10685.txt`. Goods use
the source bulk counts and prices multiplied by ten. Ranked menus offer items,
friendship services, level training, EV training/reduction, raffles, antiques and
Egg warming. The shared engine caps individual EVs at 252 and total EVs at 510.
Native Dojo training handles learned moves and evolution, while respecting the
regional level cap. Nursery rates use the source weighted percentage of a
species’ base hatch cycles and can invoke the native hatching scene.

Offers refresh on the saved game’s next day. Purchases check funds, room and
whether a service has an effect. Insufficient Bag space preserves a raffle’s
rolled outcome across reload without spending money or consuming stock. Newly
needed source items have imported icons; Rage Candy Bar uses its BW2 20-HP effect.
Online visitors, social phrases and DS connectivity are represented by local
recruitment and saved referrals rather than a network service.

Model tests cover source catalogs, migration, rank progression, all shop families,
service limits, stock, saved raffles and capacity. A native browser test covers
migration, recruitment, referral, source-priced bulk shopping and Dojo evolution.

## Management and visitor souvenirs

The manager can replace an occupied shop and move/swap plots. Replacement
requires an explicit in-game confirmation and starts the incoming shop at rank
1; cancellation or invalid/Nursery-locked choices preserve the outgoing shop.
Moving shops preserves each shop's rank, points, daily stock and pending raffle
roll. Shop creation and successful visitor referral totals persist for the
corresponding Medal Rally conditions. Older eight-plot saves initialize the
creation total from their occupied plots, since prior replacements were not
possible; older referral history cannot be reconstructed.

At rank 10 the manager opens a 20-character avenue name entry, following the
source rank-table unlock 3 and the source 21-u16 name buffer. Naming persists
and awards the naming milestone; cancelling/blank names leave it unchanged.

Each of the eight daily local visitors may bring one souvenir. The chance and
prize follow `ResortData_RaffleShopItem` in `src/ov137/resort_data_manager.c`:
first use the source rank row's `raffle_chance`, then draw from that row's
`raffle` weighted item table. Both successful and failed rolls are saved. A
full Bag leaves that same prize pending until collected or the daily cohort
changes. Only actual collection increments the souvenir count; a conversation
or repeated request cannot duplicate the reward. Daily local visitors replace
the original game's external visitor arrivals. The native shop services now
also feed the source purchase and spending Medal Rally counters after payment.

`tests/unova-avenue-management-test.js` covers atomic replacement, movement,
creation/referral records, rank-10 naming, source souvenir rolls, full-Bag and
reload retries, daily refresh and migration. The browser counterpart performs
name entry, confirmed replacement, shop movement and a souvenir/referral using
the native UI, then verifies medals and save/reload.
