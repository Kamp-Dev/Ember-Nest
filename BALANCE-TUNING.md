# Progression tuning

## Applied model

- Energy regenerates every eight seconds, with a 20-point starting capacity
  (five initial energy), 25 at keeper level six, and 30 after the first Hearth.
  Offline regeneration catches up to capacity and preserves partial ticks and
  bonus energy above the cap.
- Discovering Young adds a 20% chance of gathering a Hatchling. After Hearth,
  gathers supply Hatchlings with a 20% Wyrmling chance. A separate basic-egg
  action preserves access to low-tier quest targets.
- Shop dragons advance with discoveries up to Wyrmling. Prices are
  250 + 150 × tier + 25 × today's purchases, with the surcharge capped at ten
  purchases and reset daily. Lifetime purchases no longer inflate prices forever.
- Décor costs 600 / 2,200 / 6,500 / 14,000 / 28,000, with discovery gates and
  additive bonuses of 10% / 15% / 20% / 25% / 30%. Full décor gives 2× merge
  income instead of 18×. Legacy tributes contribute at most another 50%.
- Direct land costs 250 / 500 / 1,000 / 2,000 / 3,500. Each room-opening décor
  purchase and the level-four reward opens one tile, leaving direct land as a
  useful optional shortcut.
- Ash Trials start with 13 gathers and two safe promotions before two ash per
  promotion. Permanent pouch bonuses still apply. Sleepy's five extra gathers
  apply to each new Trial that day and reset at the daily boundary.
- Existing possessions, coins and unlocked content are retained. Old energy
  capacities migrate upward. Completed saved wishes advance after reload.
  Fractional income multipliers pay whole coins consistently.

## Seeded measurements

Thirty runs per home strategy, using production scripts and deterministic random
seeds. All runs gather as soon as energy allows and consolidate matching pieces.

| First discovery | Décor-first median gathers | Energy-wait minutes |
| --- | ---: | ---: |
| Hatchling | 5 | 0 |
| Wyrmling | 25 | 2.7 |
| Young | 125 | 16.0 |
| Hearth | 405 | 53.3 |
| Elder | 685 | 90.7 |

The historical baseline reached Hearth at 82.7 minutes and Elder at 416 minutes.
Décor-first median purchase times now span 2 / 6 / 16.8 / 46.3 / 78 minutes,
instead of finishing the catalogue at about 33 minutes. Buying shop dragons
with coins above a 5,000 reserve reaches Elder at a median 73.6 minutes, but
delays expensive décor: only one of 30 runs purchased the hoard before Elder.

The greedy Trial strategy won 439/500 seeds (87.8%) with the starting pouch,
439/500 with +3 capacity, and 497/500 (99.4%) with +6. The original starter
configuration won 0/500. These are strategy benchmarks, not human win rates
or a guarantee that every generated board is solvable.

## Interpretation and verification

Times measure energy waiting only: tapping, dialogs and breaks take no simulated
time. Home simulations omit Roost income, quests, Trials and opened level-up
chests, all of which can accelerate progression. These numbers compare the core
loop; they are not promises of session length or a complete-economy forecast.
Real-player timing and reward-inclusive simulations are the next calibration
step before claiming a stable retention or play-rate target.

The harness uses in-memory saves and does not touch browser progress.

```sh
node --test tests/game.test.cjs
node scripts/balance-sim.cjs
node scripts/balance-sim.cjs --trials-only
node scripts/balance-sim.cjs --trial-candidates
```

Regression checks cover tiered gathers, basic-egg access, shop pricing and daily
reset, discovery-gated décor, integer payouts, energy catch-up, old saves, quest
reloads and daily Trial pouch bonuses, alongside existing gameplay checks.
