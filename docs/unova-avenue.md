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
