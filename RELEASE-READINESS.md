# Ember Nest: content-expansion checkpoint

## Dragon animation continuity

Board rendering now reuses its 25 tile nodes and only replaces a tile's inner markup when its displayed contents change. Unchanged perch markup is retained too. This prevents gathers, purchases and unrelated full renders from restarting every dragon's idle animation. State labels and locked/ash/flash classes are still refreshed. No rules, currencies or saves changed.

162 tests pass, including unchanged-tile write counts, element/removal updates, Trial transitions and perch caching. A memory-only browser check exercised gathering with motion enabled, confirmed animated dragon transforms afterward, and reported no console errors. This is not a frame-rate benchmark or a substitute for real-phone testing.

## Ash randomized-opening follow-up — supersedes the calibration below

Player feedback found the one-promotion adjustment insufficient. Confirmed root cause of repeated ash placement: the fixed 17-dragon opening left exactly eight empty cells, and all eight became ash. Sampling their order never changed the visible layout.

Ash now Fisher–Yates shuffles paired dragon/ash tile records across all 25 positions on each generated opening. Starting resources remain the same (17 dragons, eight ash); target is now ten total cleared, including newly generated ash. One safe promotion and the ten-live-ash failure limit remain. `ASH_START` separates opening count from victory target. Surge retains its existing layout and rules. Independent random runs may occasionally repeat; no guarantee that every random board is solvable is claimed.

Updated `audit-ash-difficulty.cjs` tests shuffled targets 8/10/12 over 100 seeds each, two policies and three pouch bonuses (1,800 runs). At the selected target ten, the one-step aimed policy clears 13/100 with the base pouch and 27/100 with +6 or +11; first-pair merging clears 0/100. Target twelve had 0/100 base-pouch aimed clears and was rejected. These limited policies neither relocate stacks to empty landing tiles nor search future moves, so these are diagnostic results, not player win-rate estimates. Difficulty needs further human feedback.

156 tests pass. New coverage checks opening resource preservation, ash across all 25 board positions, more than 90 distinct ash layouts in 100 seeded runs, no dragon/ash overlaps, and victory at ten rather than eight clears. Refresh the app and start a new run to load these rules.

## Ash Trial calibration — September 22

Ash now has one safe opening promotion instead of two. Beginning with promotion two, two new ash spawn after warmth resolves; plain stack consolidation still creates no ash. The target (8 cleared), failure threshold (10 live), starting pouch (13 plus all earned bonuses), warmth coverage, rewards and Ember Surge rules are unchanged. The guide and existing dynamic Board hint describe the opening allowance.

`node scripts/audit-ash-difficulty.cjs` compares 100 deterministic boards per rule/pouch/policy combination (1,800 runs). The one-step aimed policy clears 42→53 with no pouch bonus and 83→53 with +6 or +11. First-pair merging clears 28→29 with no bonus and 50→29 with upgraded pouches. Earlier ash creates both pressure and reachable warmth targets, so difficulty does not increase uniformly. Increasing the target to nine instead reduced base-pouch aimed clears to 11/100 and was rejected. This is a moderate calibration aimed at upgraded play, not a guaranteed challenge for experts or a measured player win rate. Policies merge before gathering and do not search future moves; human feedback remains necessary.

154 automated tests pass, including promotion-versus-consolidation pressure timing and preservation of pouch bonuses, rewards, and Surge rules. Replays are free; no existing permanent progress is reset.

## Responsive browser check — September 22

Memory-only late-game fixture checked at 320×568 and 390×844. Board Gather/Buy/Auto Merge controls and bottom navigation remain visible; gathering was exercised at 320×568 and added a dragon. Home equipment and Stash category controls were inspected at the compact size. Nest rooms and scrolling panels were inspected in light mode, and Collection/expedition content in dark mode. This was a desktop browser viewport check, not actual mobile hardware testing or a complete interaction audit.

Fixed a reproduced header issue: large coin balances wrapped at 320px and overlapped the coin icon at 390px. The header now uses conservative compact numbers (250K, 1.2M) with exact balances in its accessible label and hover title; spending still uses the unchanged exact balance. Reduced icon size prevents collision with the amount. Very short screens still scroll the Board playfield; the action dock stays outside it.

Remaining device checks: touch dragging/merging, browser address-bar resizing, safe areas, keyboard focus while renaming, and animation performance on a real phone. Exact-balance hover text is not a dedicated touch interaction.

## Local backup and recovery follow-up

Nest → Save backups & recovery now exports versioned JSON backups, previews a selected backup, requires explicit replacement confirmation, and keeps one on-device pre-restore copy. Import validates format/version, size, board/dragon records, inventory references, contracts, reward queues and unsafe content before writing. If the safety copy or primary write fails, the primary save is not replaced. A save changed since preview requires a fresh preview. Restore reloads the page and discards temporary Trial attempts; permanent records remain in the backup. Unsupported or malformed backups are rejected rather than repaired silently.

Autosave compares the current stored value to the last value read/written by this tab and listens for cross-tab storage changes. A detected conflict blocks stale autosaves with an export/reload warning. This is best-effort local conflict detection, **not** an atomic multi-writer lock, cloud sync, or server authority. Keep one game tab open. The pre-restore copy is overwritten by the next restore and shares the same browser storage risks; downloaded files should be kept separately. No actual player save was restored during development.

Validation: 146 tests pass, including seven backup-specific tests covering round-trip preservation, cancellation, malformed input, storage failure, prior-save preservation and changed-save rejection. Browser file-picker/download behavior and true simultaneous writes were not exercised in this pass.

## First content prototype: Ember Surge

Trial polish follow-up: Run Again now remembers the completed Trial rather than switching Surge to Ash. Failed/won runs block gathers, spawns, merges and drag actions until restarted or exited. A Show hint button in the Trial action dock highlights a suggested landing tile and uses the same warmth-target calculation as actual clearing; it is read-only, local guidance, not a guaranteed solution. Result dialogs support initial focus, Tab cycling and Escape. Trial selection clears on entry/retry/exit and the accessible heading identifies Surge correctly.

Latest validation: 139 automated tests pass. A memory-only desktop browser walkthrough verified Surge entry, hint text/highlight, visible Gather/Hint controls, and exit restoring the original Home board, coins and energy. Replay identity, ended-run input locking, read-only hints, and warmth edge cases have regression coverage. Real-phone testing and difficulty validation remain open.

Now available in Trials after an Ash Trial clear. It shares the existing temporary Trial board and warmth rules: clear 12 ash, lose at 12 live ash, one safe opening promotion, and 12 extra pouch gathers. Entry/replays are free and untimed. Leaving or reloading abandons the temporary run without changing the Home board.

First clear unlocks Keeper of the Surge in Collection and grants one Element Prism; repeat clears grant nothing. Surge does not award discovery coins, permanent book entries, XP, Ash daily payouts or Ash contract credit. Delayed win/fail callbacks are bound to a run ID so a restarted attempt cannot receive an old result.

Validation: 135 automated tests pass, including generated-board playthroughs, reward idempotency, discovery isolation, reload safety and stale callbacks. `node scripts/audit-surge.cjs` solved 47 of 100 seeded boards using a one-step ash-clearing greedy policy with the base pouch. This proves some generated boards are solvable, not all, and is not a human win-rate estimate. Additional pouch upgrades may change difficulty. The feature remains visibly labeled a prototype pending player difficulty feedback; no new browser visual walkthrough was performed for this prototype.

## Status

The local code gate passes: 146 automated tests and JavaScript syntax checks. Desktop browser walkthroughs verified expedition collection, explicit departure spending, next-goal navigation, visible Board action buttons, and light/dark presentation using memory-only saves. This is a **controlled content-expansion checkpoint**, not a claim of production readiness, measured frame rate, or proven retention.

## Stabilization changes

- Optional Field expeditions in Nest → Collection, unlocked after Elder and all five decor upgrades. Routes: Ember Trail, Moonlit Coast, Ancient Grove. One trip at a time; dragons remain untouched. Fixed offers: 100,000 coins / 6 hours / 1 stamp; 300,000 / 24 hours / 3 stamps; 600,000 / 48 hours / 6 stamps. Confirmation shows remaining balance and warns that expedition spending can delay collection goals. Existing upgrade savings does not apply to this explicit purchase.
- Rewards wait indefinitely and progress offline. Twelve stamps on a route unlock its permanent, free Keeper title. Repeat trips retain journal totals, but there are no undisclosed further rewards. No coins, XP, power, premium currency, or new time-skip grants are added.
- Duplicate, early, Trial-mode and invalid expedition operations are rejected. Failed expedition saves roll back charges/claims. All other existing balances and rewards remain in place.
- Fixed the Roost picker path that could overwrite an occupied perch. Existing safe drag-and-drop swaps are unchanged.
- Unreadable JSON saves are protected from boot/autosave overwrite, with a persistent warning. Storage write failures are visible and retry on later saves. This is not cloud backup or universal recovery for every structurally malformed legacy save.
- Particle effects have a 48-node live budget, at most 24 per burst, and skip reduced-motion/hidden-page rendering. CSS animations pause in inactive views and hidden tabs. Unchanged bank markup is retained. Expedition/reserve markup caches prevent normalized DOM strings from causing repeated button reconstruction.

## Economy experiment

`scripts/audit-retention.cjs` runs 12-week memory-only production-rule simulations with two seeds, fresh/late starts, three/seven ten-minute sessions per week, and eight-second gather attempts. Three spending policies were exercised (24 runs total): existing purchases only, expeditions whenever affordable, and expeditions while saving for approaching seal-title milestones.

| Late-start policy | Casual final coins | Active final coins |
|---|---:|---:|
| Prior no-expedition baseline | approximately 5.6 million | approximately 16.8 million |
| Expedition spending | 222,010–228,350 | 26,240–42,850 |
| Save for titles, then expeditions | 324,480–934,210 | 410,850–478,120 |

In the saving-first active runs, all ten projects and the three seal-title milestones still completed. Every tested policy completed twelve weekly sets and had zero gather attempts blocked by capacity with reserve use. Expedition-heavy spending delayed projects and seal-title purchases, particularly for fresh players; optionality and the spending warning are deliberate. Income was not reduced and existing balances were not confiscated.

These simulations automate purchases, merges and claims. They do not represent human decision time, optimize Roost lineups, or exercise actual Trial participation. They assume players continue expeditions after their route titles; that motivation has **not** been validated. Players who opt out can still accumulate surplus, and three-max-shiny-Elder lineups may produce larger surpluses than these seeded lineups. The sink is a useful choice, not proof that inflation is solved.

## Repeatable checks

```text
node scripts/check-game.cjs
node scripts/audit-retention.cjs
node scripts/audit-retention.cjs --expeditions
node scripts/audit-retention.cjs --expeditions --save-first
node scripts/preview-progression-audit.cjs
```

Preview pages under `tests/progression-*-audit.html` replace localStorage with an in-memory map and must not be used as production entry points. `index.html` remains the game entry point.

## Gates before a public release

1. Real phone/touch testing in Safari and Chrome: small/landscape viewport, drag/merge, modal scrolling, text size, reduced motion, background/resume. No frame-rate or memory profiling on those devices was performed here.
2. Human fresh-save and returning-save sessions: confirm the next action is understandable, milestones feel worthwhile, and the optional economy does not feel coercive. Record session length, blocked actions, abandoned goals and perceived reward value without adding undisclosed analytics.
3. Playtest actual Trials alongside contracts, at least one Monday rollover, and long absences. Unit tests cover several timer/save boundaries, but automated economy policies do not simulate Trial wins.
4. Persistence architecture review before monetization, leaderboards or competitive rewards: localStorage is device-local and editable, not server-authoritative. Changed-save detection and local backups now exist, but atomic multi-tab conflict resolution and cloud recovery are not implemented. Do not attach real-money value to it.

## Next content boundary

Prototype one new stage behind an explicit unlock and replay it against this test suite, rather than adding many stages at once. Keep rewards in the existing inbox, state migrations backward-compatible, and power/coin payouts bounded. Expand expedition rewards only after validating player interest; do not make timer skipping or premium spending a requirement to keep playing.
