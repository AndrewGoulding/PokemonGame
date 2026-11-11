# Original Black / White campaign

Choose **Black / White** at the Unova travel guide in Sinnoh’s Fight Area, then select **Black** or **White** on first entry. This starts in Nuvema Town. The same guide offers **Black 2 / White 2**, which continues the existing campaign. Travel guides in original Unova’s towns return to Fight Area; each campaign remembers its return position and Pokémon Center.

The campaigns share the player, party, boxes, inventory, money and Pokédex as other regions do. They have separate maps, trainer flags, starters, badges, story events, League challenges, endings, Hall of Fame records, visited locations and level caps. BW1 maps use `BW1…`, trainers use `BW1_T_…`, badges use `bw1-…`, and save progress lives in `flags.unovaBW`. BW2 retains its existing identifiers and `flags.unova`. Existing saves continue to load without a reset or a destructive migration.

## Playable story

- Juniper’s gift in Nuvema, starter-dependent bedroom battles against Bianca and Cheren, lab/Pokédex, N in Accumula and the original early rival battles.
- Starter-dependent Chili/Cress/Cilan and Trio Badge; Dreamyard elemental monkey, Munna rescue and Fennel’s Cut/C-Gear; Route 3/Wellspring rescue, N in Nacrene and Lenora’s Gym.
- Dragon Skull recovery in Pinwheel Forest, Skyarrow Bridge, Castelia’s Plasma confrontation and Burgh; Bianca/Cheren battles, N’s Ferris-wheel revelation and Elesa.
- Route 5/Cheren, Cold Storage, Clay, Bianca/Fly, Chargestone Cave/N, Celestial Tower’s bell, Skyla, Twist Mountain/Cheren/Alder/Surf and Brycen in Icirrus.
- Dragonspiral Tower, awakened opposite dragon, Relic Castle search, Lenora’s legendary stone, Bianca on Route 8, versioned Drayden/Iris, Route 10/Cheren, Victory Road and the Elite Four in any order.
- N’s Castle: mandatory Lv. 50 Reshiram capture in Black or Zekrom in White, N’s opposite legendary team, Ghetsis’s original six Pokémon including Lv. 54 Hydreigon, and N’s farewell. Defeating Ghetsis clears the story; this does **not** award the Champion title or BW2’s League completion.
- Postgame eastern routes/towns, versioned Black City/White Forest, Looker/Super Rod and all Six Sages with their source TM rewards; Cobalion/Virizion/Terrakion, Kyurem and Volcarona encounters; stronger Elite Four teams and Champion Alder (ace Lv. 77) with a separate Hall of Fame.

The Black/White C-Gear shows campaign progress, season and next objective. The original campaign has its own Town Map and visited Fly destinations. Original trainer item inventories use the existing finite-inventory opponent policy; original Triple and Rotation trainer styles are preserved. Regional defeat respawns stay in the original campaign. Leaving a League challenge ends that run. Capture recovery recognizes a dragon caught at BW1’s Castle if saving interrupts the transition back to its story scene.

## Data and adaptation boundaries

`node tools/build-unova-bw.js /path/to/pokeblack /path/to/pokebw2` builds **88 authored 2D maps, 615 original trainer records and 112 season/version encounter datasets**, plus original level-up learnsets, zone headers, script text and map metadata. Original BW archives supply trainer names/classes, teams/IVs/items/moves, encounters, headers and music bindings. Version overrides come from `white.us/files` where present. Source archive hashes and the pinned checkout commit are included in generated data. `tools/render-bw-trainers.py` renders the original BW front-sprite archive’s 95 groups using the read-only Nitro-format tooling from pokebw2. Shared overworld actor resources use the retained original character models from pokebw2.

The maps and story scenes are native browser adaptations, not a DS map renderer or complete field-script interpreter. Towers, caves and cutscenes are condensed. Gyms use ordered native checkpoints with all 37 original trainee battles, themed around their original mechanics; Striaton includes type-advantage curtain questions. These do not reproduce every DS Gym maze or cutscene movement. Some trainers in unmapped source floors and optional original-only events remain outside this campaign build. Multiplayer, Entralink/online services, version-exclusive city simulation, original roaming-genie logic and every optional house/minigame are not being claimed as imported here. BW2’s larger optional-content implementation remains available through its own campaign.

## Validation

`npm test` includes all six starter/version story paths, original source teams and portraits, connected reciprocal campaign maps, versioned encounters, HM/rival order, gates, capacity/cancellation, legendary capture/loss/retries, ending vs. Champion distinctions, all Six Sages, Alder rematches, independent BW2 saves and capture recovery.

Native Playwright checks:

- `tests/browser/unova-bw-opening.js`: travel/version selection; actual starter/rival/N/Trio/Dreamyard/Wellspring/Lenora battles, monkey gift, Center nurse, switching/resuming both campaigns and reload.
- `tests/browser/unova-bw-gyms.js`: ordered library checkpoints, original Carter/Lydia/Satomi battles, legal move selection with Choice Specs and Lenora’s Badge.
- `tests/browser/unova-bw-white.js`: actual loss with a BW2 Center saved, original-region respawn, Iris battle/portrait/Badge, White music and independent level cap.
- `tests/browser/unova-bw-ending.js`: actual original Elite Four, mandatory Reshiram catch with a full party/PC delivery, N/Zekrom and Ghetsis, ending, all League rematch teams/Alder and saved Hall of Fame.

## Unified editions

The original campaign now merges Black/White version-exclusive wild tables and makes both Black City and White Forest accessible; its sequel remains a separate campaign. See [merged versions](merged-versions.md).
