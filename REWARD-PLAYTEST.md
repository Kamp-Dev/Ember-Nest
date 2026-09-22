# Reward-inclusive progression benchmark

This report records historical quest-based tuning. Nest quests have since been
replaced by weekly contracts; the script now claims those contracts instead.
The tables below are not current contract-era pacing measurements.

Run `node scripts/reward-sim.cjs`. This uses production gameplay functions in
isolated memory, never browser saves. It is an automated policy simulation,
not a manual browser playtest or a measurement of human session lengths.

## Coverage and assumptions

180 seeded runs: 30 seeds × three starting fixtures × two spending policies.
Each run advances three simulated hours in eight-second steps, invokes the
production timer callbacks, gathers, merges, claims earned level-up chests,
and processes quest cooldowns. It gifts only spare dragons (keeps one), makes
the daily Sleepy offering when a spare Young is available, seats spare
Hatchlings, collects Roost income, and buys unlocked décor when affordable.

One Trial victory is assumed at minute five; the remaining two rewards use
production Blitz. This benchmarks reward impact, not Trial-solving time or
success. The separate balance simulation exercises Trial board strategies.
The shop policy buys at most one dragon each step using coins above a 5,000
reserve. Its lower reserve deliberately competes with expensive décor.

Fixtures:

- Fresh: production new-game state, five energy, 20 coins, empty board/Roost.
- Mid: level 10, 5,000 coins, one Young, first two décor purchases, one neutral
  Hatchling perched, Young discovered, full 25 energy, two pouch upgrades.
- Advanced: level 50, 50,000 coins, one Hearth on board, all discoveries and
  décor, full 30 energy, two pouch upgrades. Roost contains shiny fire Hearth,
  shiny fire Elder and shiny water Wyrmling: a strong passive-income stress case.

Other UI interactions cost zero time. No long breaks, manual repositioning,
optional consumables, or human reaction time are modeled. Milestones mean a
dragon is present on the board; advanced players already own a perched Elder.
The RNG is deterministic, but policy timing changes its later sequence, so
small differences between variants should not be interpreted as causal proof.

## Final results

### Progression-quest follow-up

The current script preserves the highest discovered tier before donating, so a
player can accumulate five toward the next discovery. Merely keeping one copy
was insufficient: repeatedly donating the second highest-tier copy prevented
progression in the earlier policy. The quest card now warns about that tradeoff.

With scaled quests, all 30 fresh runs per spending policy reached their first
Elder: median 96.9 minutes saving and 60.8 minutes shopping. Mid fixtures reached
Elder at 78.7 / 44.7 minutes. All fresh and mid runs completed décor within three
hours. These are policy-dependent simulation times, not human playtime targets.
Advanced fixtures already own an Elder and donate spare Hearths; none built an
additional board Elder under that policy. Players pursuing more Elders must
choose to keep their Hearths instead. Advanced coin accumulation remains an
endgame content limitation, not a solved retention model.

Current validation: 41 regression tests pass. Requests and displayed payouts
are checked against discovery tiers, including migration of a saved egg request
to Hatchling after Hearth, single consumption, and permanent unlock persistence.

### Earlier reward-tuning snapshot

Historical snapshot from the reward-tuning pass, before progression-scaled quests.
The current quest system replaces the fixed request list; rerun the script for
current measurements rather than treating this table as current pacing.

Median minutes from each fixture's start. Every run produced a board Elder.

| Start / spending policy | Hearth on board | Elder on board | All décor by 180m |
| --- | ---: | ---: | ---: |
| Fresh / save after décor | 72.4 | 137.3 | 30/30 |
| Fresh / spend surplus in shop | 49.9 | 81.2 | 0/30 |
| Mid / save after décor | 49.7 | 114.0 | 30/30 |
| Mid / spend surplus in shop | 29.6 | 62.9 | 2/30 |
| Advanced / save coins | Already owned | 38.7 | Already owned |
| Advanced / spend surplus in shop | Already owned | 10.0 | Already owned |

Fresh saving runs finish décor at a median 72.5 minutes. Fresh shop runs spend
a median 310,075 coins in three hours and retain about 5,536 coins. They do not
save enough for the final 28,000-coin décor item. This is a spending tradeoff,
not an unlock failure: stopping shop purchases allows savings to accumulate.

Compared with the isolated gather model, gifting and parking dragons can
delay the first Elder even though rewards generate extra coins. Rewards are
therefore not simply a fixed percentage speed boost.

## Changes from this pass

- Chests retain 3,000 coins at level five, then gain 1,500 per chest tier up to
  a 9,000-coin cap. Previously payouts grew by 3,000 forever (63,000 at level
  105). Dragon rewards are unchanged. Claims now validate the earned level,
  reject duplicate clicks, and persist claimed levels across reloads.
- Trial clear XP now follows the same three-paid-clears-per-day limit as the
  main rewards. Practice clears remain available; ordinary merge XP is unchanged.
- Roost base income per minute is 15 / 40 / 70 / 110 / 160 / 240 by dragon tier.
  Shiny multiplies base income by 1.5, with the existing 50% element synergy
  bonus retained. Ordinary neutral Eggs still earn 22/minute.
- The strong advanced fixture's three-hour Roost payout falls from 627,660 to
  157,860 coins with identical perched dragons. Early fresh-run Roost earnings
  fall much less: about 34,304 to 30,720 in the benchmark.
- Bank collection preserves the partial minute toward the next income tick.
  Existing bank balances above a reduced capacity are retained, not truncated;
  no more income accrues until the balance is below the cap again.

## Remaining design limits

Finite décor and six dragon tiers mean advanced players who stop spending will
still accumulate coins (about 414,000 final coins in the advanced saving policy).
Tuning cannot supply new goals after the catalogue is complete. Repeatable
endgame goals are the next content decision, not a reason to erase savings or
raise prices without limit.

Future validation should include human sessions, multi-day return habits,
optional consumables, alternative quest priorities and a stronger Trial solver.
No browser layout or touch-input validation is claimed by this benchmark.

Verification: 39 regression tests pass, including persistent chest claims,
Trial XP limits, Roost partial ticks, capped offline income and preservation of
existing banked coins. JavaScript syntax checks and diff whitespace checks pass.
