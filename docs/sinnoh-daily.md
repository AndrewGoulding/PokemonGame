# Sinnoh daily activities

The Platinum importer supplies Honey Tree species, all 16 Trophy Garden
visitors, both Great Marsh daily pools, six Marsh encounter tables and source
Safari flee rates. `game/sinnoh-daily.js` keeps their per-player state.

- Twenty-one golden trees represent Platinum's tree locations on adapted 2D
  maps. Each uses one Honey, becomes ready after six game-clock hours, and
  expires after twenty-four. This project's clock advances by walking, so the
  wait is 600–2,399 steps. The source trainer-ID rule selects four Munchlax
  trees. Encounter groups, slot weights, levels 5–15 and the consecutive-tree
  group reuse follow Platinum. Species/level/timer save before the encounter;
  battling consumes the visitor. Honey is sold in Floaroma Meadow.
- Backlot announces a new visitor at most once per day after regional research
  certification. Today's and yesterday's visitors replace slots 6 and 7 in
  Trophy Garden. A new visitor excludes both prior species. The mansion and
  garden use adapted interiors/outdoor geometry.
- The Great Marsh has six areas in a connected 2×3 grid with tram stations, source land/Surf/rod tables,
  a saved daily visitor in each area, and ₽100 binocular reports. Entry costs
  ₽500 and grants 30 Safari Balls and 500 steps. Native Bait/Mud battles use
  Gen 4 Safari stages and Platinum species flee rates. The shared Safari UI
  handles capture/storage, Ball exhaustion and retirement; Sinnoh's exit goes
  to Pastoria's reception. Leaving the Marsh ends its session. This is a local
  2D facility with simplified tram navigation, not the DS map matrix or mud
  movement simulation.
- Solaceon's newspaper requests a seen regional species each game day and
  rewards showing it with three randomly selected source Ball types and one
  Heart Scale. The daily request among seen species is a local adaptation of
  the source newspaper's deadline/request selection.
- Drifloon appears at Valley Windworks on Fridays after Mars is defeated and
  can be encountered once that Friday. Its level is **15**, from Platinum's
  script (not Diamond/Pearl's 22). The source's same-day Mars-clear delay is
  simplified to the saved campaign completion check.

Golden trees occupy open 3×3 clearings so they cannot close a narrow travel
corridor. Permanent map markers combine with story patches: the Honey Tree at
Windworks does not remove the Works Key door lock.

Native browser checks cover Marsh entry/tram/step exhaustion, save records,
Backlot's announcement and a Honey Tree encounter. Runtime checks cover
saved timers, Munchlax selection, cancellation, expiration, daily rotation,
rewards, Friday recurrence, Safari stages and tree placement.
