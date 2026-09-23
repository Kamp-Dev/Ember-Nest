# Progression audit — September 22, 2026

## Stabilization checkpoint

See `RELEASE-READINESS.md` for the latest expedition economy comparison, save safeguards, Roost overwrite fix, motion/rendering work, browser walkthrough and remaining release gates. The code gate now passes 129 tests. Historical sections below preserve earlier findings and counts; they are not claims that every prior issue remains unchanged or that human retention is proven.

## Element Prism implemented

- Rare consumable in Home → The Stash → Items, using the existing icon-based consumable presentation. Earn one introductory Prism at level 10 (existing eligible players included), then one when both weekly bonuses are completed. Award flags persist; a completed pair is reconciled before weekly rollover. No purchase or premium-currency path was added.
- Select a Board stack, select Fire/Water/Nature, then explicitly confirm spending one Prism for the entire stack. Eligible stages are Wyrmling through Elder. The target element must already be recorded at that exact stage; shiny stacks require the matching shiny discovery. This version reorganizes known lineages, rather than bypassing discovery/mastery.
- Preserves all other dragon fields, stack count and shiny status. No coins, XP, promotion progress or new discoveries are awarded. Works on a full Board because it uses no additional tile. Excludes locked tiles, reserve, Roost, Eggs, Hatchlings and Trial mode.
- Cancellation, stale/replaced/modified stacks, invalid targets and duplicate confirmation do not spend another item. Returning to an earlier element requires another Prism. Save/reload preserves both the result and reward flags.
- Existing legacy `time_skip_1h` catalog/use code was discovered during this implementation and left unchanged. No new time-skip distribution was added.
- Validation: 119 regression tests pass, including five Prism-specific tests covering economy/trait conservation, full boards, cancellation, stale selection, duplicate confirmation, eligibility, awards and rollover. JavaScript syntax check passes. Browser visual verification was not performed in this pass.

## Retention follow-up: weekly bonuses, collection choices, 12-week benchmark

Implemented in order:

1. Completing and claiming all five contracts opens two optional bonus goals. Gather target is 60 + 10 × selected tier; promotion target is 15 + 3 × tier. Each automatically banks one cosmetic token and one permanent collection seal. Maximum two bonus rewards per local-calendar week. Progress starts after the five claims, never backfills earlier actions, and unfinished progress resets Monday. Earned seals/tokens persist; no daily streak or consecutive-week requirement.
2. Added three permanent, cosmetic-only Keeper titles in Nest → Collection: Lantern Wayfarer (4 seals, 150,000 coins, 2 tokens), Dragon Chronicler (12 seals, 500,000 coins, 4 tokens), Starlight Curator (24 seals, 1,000,000 coins, 6 tokens). Seals are unlock thresholds, not spent currency. Players can track any unowned collection reward on the Board. Existing titles, styles, projects and ownership remain intact.
3. Added `scripts/audit-retention.cjs`, using production gameplay in a memory-only harness: 12 weeks, two seeds each, fresh/late starts, casual three or active seven ten-minute sessions per week, one gather attempt every eight seconds. It uses actual merge, reward, donation, storage, purchase and project functions. It does not fabricate Trial wins or mastery. Automatic merging/claiming, one purchase per action, unoptimized Roost seating and a fixed cosmetic/project spending policy limit its realism. Eight runs are diagnostics, not a population estimate or a prediction of retention.

The first run found that the old advanced gather target prevented casual completion entirely. New weeks now use 60 + 16 × tier + rotation × 5 gathers and 15 + 5 × tier promotions. Current weekly targets/progress and already-generated bonus targets are not rewritten. Existing Trial tasks, donation rules, rewards and replacements remain unchanged.

Final benchmark:

| Start / schedule | Completed weeks | Seals at week 12 | Stored Elder stacks | Blocked gather attempts |
|---|---:|---:|---:|---:|
| Fresh / casual | 12 | 12–13 | 6–8 | 0 |
| Fresh / active | 12 | 24 | 46–47 | 0 |
| Late / casual | 12 | 12 | 9 | 0 |
| Late / active | 12 | 24 | 48 | 0 |

Wayfarer unlocked in weeks 2–5. Active Chronicler unlocked in weeks 6–8, late casual in week 12; fresh casual met its seal requirement by week 12 but the simulation's project spending left insufficient coins. Active Starlight unlocked in week 12. These are observed unlocks under this policy; the theoretical earliest seal gates are weeks 2, 6 and 12.

**Open balance issue:** late saves retained about 5.6 million coins (casual) or 16.8 million (active), even after projects and unlocked titles. Do not describe these additions as solving the coin economy. No income nerf or time-skip currency was introduced. Future tuning should compare deliberate saving versus project-first spending and include human playtests and actual Trial participation.

**Consumable recommendation, not implemented:** prototype a scarce, earned element-change item before time skips. Require explicit dragon selection and confirmation, preserve tier/count/shiny status, prevent Trial use, and define mastery eligibility before implementation. Time skips should wait until offline-income and coin-surplus decisions are settled; they must not advance weekly resets or time-limited claims. No premium currency, monetization or new image assets were added in this pass.

Validation: 114 regression tests pass, covering bonus caps, post-unlock progress, save/reload, Monday rollover, Trial/invalid-event rejection, unchanged current-week targets, title purchases and tracking. JavaScript syntax checks pass.

## Follow-up implemented: Elder reserve and contextual goals

- Nest now has a reversible Elder reserve. Store moves an entire board Elder stack; Return requires a free unlocked board tile. All dragon fields survive the move and reload. No fees, expiry, automatic removal, or passive reserve income. Trial mode blocks both operations. Stored Elders continue to count for recovered discoveries and progression unlocks.
- The Board's former savings hint is now a clickable Next Goal prompt. It prioritizes Elder crowding, waiting rewards and ready mastery/contract claims, then decor, Sanctuary projects and collection goals. Navigation never spends resources or claims rewards automatically.
- 109 regression tests pass, including trait/stack conservation, reload, duplicate returns, full-board returns, legacy saves, Trial restrictions and endgame guidance. JavaScript syntax checks pass.
- Memory-only browser walkthrough verified storing/returning an Elder, unchanged resources, Collection navigation, and visible Board action buttons. Real player storage was not used.
- The original audit below describes the pre-reserve baseline. Its economy and pacing findings remain open; this update does not rebalance prices, income, or contract targets.

## Latest validation: short sessions and UI walkthrough

This pass adds diagnostics and memory-only browser fixtures, not gameplay or balance changes. 105 regression tests pass. The historical sections below retain their original counts and findings.

### Priorities found

1. **High — Elder accumulation eventually blocks the core loop.** A direct stress reproduction with 25 board Elders and three occupied Elder perches leaves zero open spaces after Gather, Buy and Auto Merge. Energy is not lost, but play cannot progress through those actions. The weekly donation asks for Hearth (tier 4), not Elder. Normal perch swaps preserve population; there is no explicit, reversible Elder reserve. In the short-session late scenario, the median board had 15 Elders and no free cells by session 12, with 362 gather attempts blocked by capacity across the run. That policy does not optimize perch replacements or elemental targets; the separate all-Elder reproduction establishes the terminal case independently. **Recommended first fix:** a player-controlled Sanctuary reserve that stores/retrieves Elders, preserving element, shiny status and ownership. No automatic deletion, sale, prestige reset or power reward is needed.

2. **Medium — session pacing changes sharply after returning to Roost income.** Fresh short-session saves reached first Elder at median 24.8 active minutes, in the third session after two six-hour breaks. The uninterrupted protected-shop benchmark was 66.9 minutes. These are different policies (four-second attempts versus eight-second gathers, breaks versus continuous play, no Trial wins versus assumed wins), not a controlled measurement of the Roost alone. Nevertheless, accumulated bank income visibly funds large purchase bursts. Validate a target return-session experience before changing earned income or shop prices.

3. **Medium — weekly goals are short checklists, not week-long progression.** Fresh short-session saves finished all five introductory contracts within session one; mid and late snapshots had all five claimed by session three. The continuous benchmark gives starter completion at 12.1 minutes and mid/advanced completion around 30–42 minutes. Introductory targets deliberately stay fixed as the player grows. Keep that fairness; consider optional post-completion objectives rather than lengthening a live week or requiring daily attendance. This test did not cross the Monday reset.

4. **Medium — optional coin goals remain finite and affordable within a few days for an established Roost.** The late seeded policy collected 3,141,600 Roost coins over twelve ten-minute sessions separated by six hours, and ended with median 2,482,970 coins despite median 1,131,275 spent on dragons. All ten Sanctuary projects total 2,750,000. Projects were deliberately not purchased in this benchmark; this is available spending capacity, not measured project completion. Do not treat current projects as a weeks-long retention system.

5. **UX — Board guidance does not advance to endgame goals after decor.** Browser checks showed fresh gather/energy feedback working, midgame savings blocking a purchase with an accurate 6,500-coin Hot spring explanation, and the late Board without a replacement savings goal once decor is complete. Nest still points to Collection, where projects live. Recommend a contextual Next Goal entry linking to reserve space, claimable rewards, mastery or projects; it should explain existing systems before adding more.

### Benchmarks from this pass

Short sessions: ten deterministic seeds per scenario, twelve ten-minute sessions, six hours between sessions (120 active minutes across about 68 elapsed hours). Medians:

| Starting snapshot | First Hearth, active minutes | First Elder, active minutes | All decor, active minutes | Board Elders after session 12 |
| --- | ---: | ---: | ---: | ---: |
| Fresh | 18.9 | 24.8 | 20.0 | 15 |
| Mid: level 10, Young | 13.1 | 23.4 | 13.1 | 14 |
| Late: level 50, Elder, all decor | Already unlocked | Already unlocked | Already unlocked | 15 |

Continuous rerun: 30 seeds for each of six scenarios/policies (180 runs), three hours each. Fresh protected-shop medians: Hearth 40.9, Elder 66.9, all decor 53.7 minutes. Fresh no-shop: Hearth 57.9, Elder 94.3, decor 58.0. All 30 fresh seeds in each policy reached Elder and all decor. The existing reward-inbox reproduction preserved all 12 dragons from a full-board level-25 chest.

### Method and limits

- `node scripts/session-progression-audit.cjs` runs production functions with isolated storage, deterministic randomness, simulated calendar time and timer catch-up during breaks. It starts sessions with available energy, attempts actions every four seconds, consolidates immediately, claims rewards, seats spare Hatchlings, buys available decor, and buys dragons above a 5,000-coin reserve with upgrade savings on. It does not invent Trial victories or buy Sanctuary projects.
- `node scripts/reward-sim.cjs --reserve-decor` reruns the earlier optimistic continuous policy, including its assumed Trial victory. See the original limitations below.
- `node scripts/audit-progression.cjs` reproduces full-board reward preservation, target snapshots and the terminal Elder board.
- `node scripts/preview-progression-audit.cjs` creates fresh/mid/late browser walkthrough fixtures. Each replaces localStorage with an in-memory map before loading the app. Real player saves were not inspected or altered.
- This is an automated progression audit plus a manual UI walkthrough, **not** a human retention study. Reading time, manual drag skill, attention, targeted elemental breeding, perch optimization, voluntary spending choices and real browser close/reopen behavior are not modeled. The mid/late starts are synthetic snapshots, not longitudinal player saves. Snapshot fields are separate medians and need not describe one individual run.

Recommended next implementation: resolve Elder crowding first, then add contextual goal navigation. Retune the economy only after those changes are tested; do not punish returning players by silently reducing earned income.

## Implemented follow-up

The original findings below are historical. The following changes are now implemented:

- Chest and Trial dragon gifts use a persisted reward inbox when the board is full. Nest provides explicit partial collection; uncollected dragons never expire. Purchases and consumables still require space and are not charged on failure. This protects future rewards; missing historical gifts cannot be reconstructed reliably from old saves.
- New games start with optional upgrade savings enabled. Existing saves retain their preference (legacy saves without that field retain the old off behavior). Board guidance points toward the next decor cost or waiting inbox rewards.
- New weekly sets have one each of gather, promotion, Roost collection, Trial/specific-stage nurture, and donation/promotion-income goals. Targets are fixed when generated; current weeks are not rerolled. Activity-weighted payouts replace flat per-slot rewards. One token and 500 coins still reward a complete week. No daily attendance requirement or streak penalty was added.
- After Elder and all decor, ten optional Sanctuary projects cost 50,000 through 500,000 coins (2,750,000 total). Permanent equipable titles unlock at ranks 1, 5 and 10. Projects add no income/power bonus and do not reset.
- Energy regeneration, base shop prices, merge payouts, Roost rates, and earned player possessions were not nerfed.

### Follow-up verification

101 automated tests pass, including eight new progression regression tests. Read-only browser fixtures verified partial reward collection, project spending, title unlocking/equipping, new weekly activity rows, and accessible Board controls at 390×844 and 320×568.

Updated reward-inclusive simulation: 30 seeds per scenario/policy, three hours, upgrade savings enabled. Fresh saves using the shop reached Hearth at median 40.9 minutes, Elder at 66.9 minutes, and all decor at 53.7 minutes; all 30 reached Elder and completed decor. Fresh no-shop results remain Hearth 57.9 / Elder 94.3 / decor 58.0 minutes. This preserves the earlier protected-shop pace rather than adding a grind wall.

Weekly completion medians: starter snapshot 12.1 minutes; mid snapshot 30.1–42.4; advanced snapshot 38.8, with all 30 seeds completing each scenario. Starter goals intentionally remain introductory when the player grows during their first week. These are optimistic automated benchmarks, not human engagement or retention measurements. The same simulation limitations below apply.

Run all regression tests with:
node --test tests/game.test.cjs tests/wardrobe.test.cjs tests/progression.test.cjs

Run node scripts/preview-progression.cjs to regenerate tests/progression-preview.html (memory-only browser save). Reload resets this fixture; never use it as a real play save.

Next validation: playtest short sessions and watch whether players understand savings, find inbox rewards, and choose meaningful post-Elder goals. Retention cannot be guaranteed from code or simulated completion times alone.

Scope: current production rules, read-only in-memory diagnostics. No economy values or player saves changed. Legendary's sheen was separately strengthened with an ivory sweep.

## Findings, in recommended order

1. **High: full-board rewards can be lost.** In app.js, revealChest marks the chest claimed before calling spawn, and ignores failed spawns. Reproduction: level 25, 25 occupied open tiles, claim chest. Result: +9,000 coins, claimed=true, still 25 dragons. Its eight eggs, two Hatchlings, Wyrmling and Young were not delivered. winStage also ignores gift spawn failures. Add a persistent pending-reward queue or capacity-safe claim flow before adjusting reward amounts.

2. **Medium: shop spending can starve decor progression.** In 30 fresh-save, three-hour reward-inclusive runs with purchases above a 5,000-coin reserve, zero runs bought all decor. With the existing save-for-decor option enabled, all 30 did. Consider introducing that option alongside the first eligible upgrade, with a clear remaining-cost display; do not silently force it on existing players.

3. **Medium: weekly contracts behave like one short checklist, not five varied goals.** rollContracts always assigns two gather goals (three at tier zero); contractEvent advances them simultaneously. At Elder the largest gather goal is 180, or 24 minutes of regeneration at one energy per eight seconds before accounting for initial energy. Other requirements include 25 promotions, one or two Trials, and one Hearth donation. This is not a measured total completion time. All five pay the same 700 coins each at Elder, regardless of effort, plus 500 and one token for the week. Recommend varied objectives and effort-sensitive rewards without requiring daily attendance or taking away earned progress.

4. **Medium: late-game coin income outpaces finite coin goals.** One shiny Elder in a matching room earns 540 coins/minute, or 259,200 over eight hours. Three matching shiny Elders yield 777,600 at capacity. All decor totals 51,300; optional collection coin costs range from 25,000 to 100,000, while the late shop caps at 800 per Wyrmling. Token/mastery requirements still gate cosmetics. Add worthwhile optional long-term spending before broad income cuts.

5. **Design decision: energy is a short-session throttle, not a return timer.** Capacity 20 refills in 160 seconds; late capacity 30 in 240 seconds. That supports nearly continuous play. Preserve it if that is the intended experience; retention should come from goals rather than a sudden large energy nerf.

## Measured benchmarks

Reward-inclusive fresh saves, 30 seeds per policy, 180 simulated minutes:

| Policy | First Hearth median | First Elder median | All decor by end |
| --- | ---: | ---: | ---: |
| Gather + claim rewards, no shop | 57.9 min | 94.3 min | 30/30 |
| Same, shop above 5,000 reserve | 39.2 min | 58.1 min | 0/30 |
| Same, shop with decor savings | 40.7 min | 66.3 min | 30/30 |

No-shop fresh saves ended with a median 212,409 coins after buying all decor. Advanced seeded saves without shop ended at 427,610 (starting at 50,000).

Gather-only lower-bound benchmark, no decor: first Hatchling at 5 gathers, Wyrmling 25, Young 125, Hearth median 397, Elder 685. Median regeneration-only Elder time 90.7 minutes. The first Hearth upgrades the gather floor from Egg to Hatchling, a substantial acceleration.

Greedy Trial solver: 431/500 wins with pouch bonus 0, 431/500 with +3, 497/500 with +6. These are strategy-specific results, not human win rates; do not rebalance Trials from them alone.

## Limitations

Simulations consolidate instantly, do not model reading, manual drag time, breaks, or element-targeting preferences. Reward-inclusive runs attempt one gather every eight seconds and assume a Trial victory at minute five plus the remaining daily Blitz rewards. They seat spare Hatchlings automatically. First Elder is not completion of all elemental mastery or the game. Advanced scenarios are seeded, not longitudinal saves. Weekly variety and long-term retention need playtesting.

## Reproduce

- node scripts/audit-progression.cjs
- node scripts/balance-sim.cjs
- node scripts/reward-sim.cjs
- node scripts/reward-sim.cjs --reserve-decor
- node --test tests/game.test.cjs tests/wardrobe.test.cjs

Existing 93 tests pass; passing them does not negate the newly reproduced full-board reward-loss gap.

Recommended next implementation: preserve undelivered rewards and test claiming/reloading on full boards; then improve upgrade-saving guidance; then tune weekly contract variety and endgame spending.
