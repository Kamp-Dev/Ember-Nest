# Sanctuary Defense — Forest Gate

## Play

Trials → Play Sanctuary Defense. Requires discovery of a Wyrmling and no active Ash Trial. Select Fire, Water or Nature, select a numbered perch, and Deploy. Start each wave when ready. Deploy and upgrade during waves; recall only between waves for a full refund. Pause/Resume stays in the sticky header. Switching away from the browser pauses an active wave and requires manual resume. Exit, Escape or reload discards the run. Retry is free after victory or defeat.

## Prototype boundaries

This is the first combat slice, not a finished campaign. Three training Wyrmling types are available regardless of collection composition. Your collected dragons are neither moved nor consumed. There is no purchase with permanent coins, no energy charge, no battle save, no offline combat, no first-clear reward and no permanent progression recorded. The normal game's background accrual continues independently. Enemy shapes are prototype markers; dragon art uses existing elemental assets.

## Rules

- 12 nest health; 60 starting battle energy; six deployment pads; five manually started waves.
- Deployment costs 20. Ranks two and three cost 25 and 40. Rank adds 65% of base damage and two range units. Rank three is the limit.
- Fire: 9 base damage, 29 range, 1.2-second attack interval, 13-unit splash radius.
- Water: 4 damage, 30 range, 1-second interval, 45% slow for two seconds.
- Nature: 4 damage, 28 range, 1.5-second interval, 0.65-second root with a 2.4-second recovery window. Other dragons within 34 units gain 25% damage; this does not stack.
- Scouts: 22 HP / speed 10 / 4 energy / 1 leaked damage. Runners: 25 HP / speed 17 / 4 energy / 1 leaked damage. Stonehides: 65 HP / speed 8 / 2 armor / 7 energy / 2 leaked damage. Boss: 420 HP / speed 6 / 1 armor / 12 leaked damage.
- Five waves: scouts, runners, armored group, mixed assault, boss with escorts. Surviving a nonfinal wave grants 15 energy. No rewards for leaked enemies.
- Attack target: furthest-progressed enemy within range. Distances/speeds use the 100×100 battlefield coordinates. Damage resolves before movement; death grants energy once. A leaked boss always destroys the nest.

## Validation

Run `node scripts/check-game.cjs` for syntax and regressions, or `node scripts/audit-defense.cjs` for production-simulation playthroughs. 170 tests pass at this checkpoint. Defense coverage includes invalid commands, spending and refunds, pause, distinct role effects, nonstacking support, boss loss, full five-wave win, underinvestment loss, retry, gating and preservation of main state/storage.

Memory-only desktop browser playthrough completed all five waves with 12 health, followed by a free retry and exit; exact permanent coins remained 250,000 and no console errors appeared. The 390×844 layout and pause/resume were inspected. This is not a real-phone touch test or an engagement measurement. One tested mixed strategy deploys Fire/Water/Nature at pads 1/2/3, adds Fire at 5, then Water at 6 and Nature at 4, upgrades Fire 5 and Water 2 before wave four, then Fire 5 to rank three before the boss.

## Next decisions after playtesting

1. Is placement and upgrading enjoyable without rewards? Test a second path only after feedback on this one.
2. Replace prototype enemy markers with original enemy art and clearer attack feedback.
3. Decide how collected dragons unlock roster choices without letting existing Elders or saved coins bypass combat.
4. Add persistent chapter completion, balanced first-clear rewards and specializations with save migration and duplicate-claim tests.
5. Build touch and assistive-technology interaction coverage on real devices. Current combat requires visually tracking enemies; keyboard-operable controls alone do not make the real-time battlefield fully nonvisual.
