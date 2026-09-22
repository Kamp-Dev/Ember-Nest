# Ember Nest balance review

This is the historical, pre-tuning baseline. The changes and current simulation
results are documented in [BALANCE-TUNING.md](BALANCE-TUNING.md). Running the
simulation now exercises the updated rules, not the historical results below.

## Method and limits

The experiment runs the production data, core, and app scripts in isolated memory.
It changes no balance values and never reads or writes browser saves.

- Progression: 30 seeded runs each for saving coins and buying décor as soon as affordable.
  Gather continuously and consolidate matching stages immediately. Stop at the first Elder.
  Production merge rewards, discoveries, XP, level unlocks and the first-Hearth bonus apply.
- Time means energy waiting time only, starting with five energy. Tapping, dragging,
  reading dialogs, and breaks take zero simulated time. These are optimistic continuous-play
  estimates, not expected real-world completion times.
- Progression excludes purchased eggs, quests, perches, Trials, and opened level-up chests.
  This isolates the main loop; those other systems can accelerate it.
- Trials: 500 seeds per pouch size. A greedy player chooses the matching merge that burns
  the most ash, otherwise consolidates near ash, and gathers when no matching pair exists.
  Production render-time element assignment and scheduled failure conditions are included.
  No lookahead or deliberate relocation to empty tiles. This is a strategy benchmark,
  not a proof of board solvability or a measured human win rate.

Reproduce with `node scripts/balance-sim.cjs`; trials alone use
`node scripts/balance-sim.cjs --trials-only`. Full runs can take a few minutes.

## Main progression

| First dragon | Eggs gathered | Minimum energy-wait time | Median keeper level |
| --- | ---: | ---: | ---: |
| Hatchling | 5 | No waiting with initial energy | 1 |
| Wyrmling | 25 | 2m 40s | 3 |
| Young | 125 | 16m | 8 |
| Hearth | 625 | 1h 22m 40s | 19 |
| Elder | 3,125 | 6h 56m | 45 |

The fivefold cost at each dragon stage makes the later gaps much longer. Auto Merge
helps with interactions, but does not remove the energy wait. Five energy holds only
40 seconds of regeneration, so these times require near-continuous gathering.

## Décor and coin growth

Buying décor immediately produced these median purchase points:

| Décor | Gathered eggs | Approximate energy-wait time |
| --- | ---: | ---: |
| Moss bed | 20 | 2m |
| Ember lamp | 40 | 4m 40s |
| Hot spring | 90 | 11m 20s |
| Tea hoard | 160 | 20m 40s |
| Star roost | 250 | 32m 40s |

The entire décor catalogue finishes well before the first Hearth. Full décor raises
the merge multiplier from 1× to 18×. By the first Elder, the median coin balance was
142,185 without décor versus 2,205,845 with immediate décor purchases, after paying
for the décor. This is a strong compounding incentive and leaves little décor to
work toward through most of late dragon progression.

## Economy comparisons from the current rules

- Bought eggs cost 250, then 290, then 330, increasing by 40 forever. The first ten
  cost 4,300 in total; the 100th costs 4,210 by itself. A basic non-shiny first-stage
  merge pays only 125 before décor and one-time discoveries. Buying eggs is expensive
  early, whereas late décor income can make early purchases cheap.
- Direct fog purchases cost 1,500 / 4,500 / 12,000 / 25,000 / 50,000: 93,000 total.
  Each room-opening décor purchase also opens two fog tiles for free. Moss, lamp,
  and pool cost only 11,300 combined and can open all five tiles, while also providing
  rooms and income bonuses. Direct land purchases are usually a poor competing use
  of early coins.
- One ordinary neutral Egg on a perch earns 22 coins/minute, or 1,320/hour;
  a neutral Hatchling earns 67/minute, or 4,020/hour. Eight-hour bank capacities are
  10,560 and 32,160 respectively. Passive income can pay for early décor quickly.
  These examples include neutral-element synergy and exclude shiny bonuses.
- Three daily trial clears pay 2,400 coins plus dragon gifts; Blitz uses those same
  remaining clears. It is valuable early but small beside late 18× merge income.
- Quests multiply their coin rewards by the décor bonus. The five-gift milestone
  also multiplies its 1,500-coin payout and supplies more dragons, strengthening
  the early-décor advantage. The Sleepy Dragon offers 3,000 coins and ten energy
  for one Young, creating a real tradeoff against keeping it for a Hearth.

## Ash Trials

| Starting pouch | Wins / 500 | Strategy success rate |
| --- | ---: | ---: |
| 4 (starting player) | 0 | 0% |
| 7 (level-2 pouch bonus) | 224 | 44.8% |
| 10 (second pouch bonus) | 224 | 44.8% |

The starting four-egg pouch is particularly punishing for this strategy. The larger
pouch beyond seven did not improve results: those runs fail because of board/ash
conditions before the extra supply helps. More eggs alone is unlikely to address
that failure mode. Human play with repositioning or planning could do better.

## Recommended tuning order — not applied

1. **Trial accessibility:** compare extra ash grace, gentler ash growth, and an
   introductory trial layout. Test with a stronger planner and human play before
   declaring a target win rate or changing the permanent trial.
2. **Décor pacing:** reduce the size of early multiplier jumps or distribute décor
   unlocks along dragon progression. Raising prices alone could make the opening
   slower without fixing the 18× late income.
3. **Land value:** decide whether direct tile purchases are intended as shortcuts.
   If so, price them against the room décor that grants the same tiles for free.
4. **Late dragon pacing:** decide the intended time to first Hearth/Elder before
   tuning regeneration, egg purchases, or quest gifts. Preserve useful goals between
   the final décor purchase and later dragon stages.

Next experiment: compare a few proposed trial and décor variants in simulation,
then choose the changes explicitly. These findings are a baseline, not a balancing patch.
