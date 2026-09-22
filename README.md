# Ember Nest

Merge + decorate prototype. Cozy dragon nest. **5-merge**.

## Play
Open `index.html` in a browser (phone or desktop).

## Loop
- **Gather** spends 1 energy. Discoveries improve the gathered dragon tier;
  quests adapt to your unlocked gathering tier and dragon discoveries.
- Drag matching pieces onto each other to stack them.
- **5 of the same stage** become the next dragon and pay ember coins.
- Spend coins on nest decor. Each piece raises the merge coin bonus.

## Chain
Egg → Hatchling → Wyrmling → Young ember → Hearth dragon → Elder hearth

## Weekly contracts
Five contracts replace nest quests and the five-gift milestone. They reset Monday
at midnight in local time, including after time away. Gathering and promotion
goals count successful home-board actions, not shop purchases or Trial merges.
Trial goals unlock for weeks generated after your first Trial victory; Blitz counts.
Donations always use a lower tier than your highest discovered dragon.
Difficulty and rewards are fixed when the week's set is generated.

Claim each reward manually. One unclaimed contract can be replaced free each week;
that contract's progress is discarded. Claimed contracts cannot be replaced.
All five claims award +500 coins and one persistent cosmetic token. Tokens are
spendable on Tide Crown and Grove Crown portrait frames (one token each) in the
contracts panel. Ember Crown is a free one-time claim. Equip frames from The Stash. Unclaimed rewards
expire at the next reset. Old coins, dragons and possessions are preserved.
Sleepy Dragon remains a separate daily offering. No Basic Egg button is needed.

## Getting started
The Dragon Book keeps its illustrated pages and Main/Rare tabs, with Beginnings,
Fire, Water, and Nature chapters. Beginnings contains only Egg and Hatchling;
Hatchlings branch into an element at Wyrmling, so there is no unobtainable neutral
Wyrmling-to-Elder collection. Existing stage discoveries remain saved for progression;
each element tracks Wyrmling through Elder independently with its own lore.
Shiny discoveries also count in Main. Element entries persist after dragons leave
the board and do not issue extra stage-discovery coins. Older saves recover
elements from currently owned board/perch dragons; lost historical elements
cannot be inferred from the old stage-only records.

Open **Dragon Book → Elemental mastery** for permanent collection milestones.
Each element's four Main stages unlock its Keeper title and one cosmetic token;
each element's four Rare stages unlock its Radiant Keeper title and two tokens.
Shiny discoveries count toward both collections. Claim each reward once at the
nest, then equip/remove titles in that panel. Claims persist across weeks, reloads,
and Book-only resets. No dragons are consumed and titles grant no stat bonuses.
Tokens use the existing frame shop in Weekly contracts. Older saves receive no
automatic token payouts; eligible players explicitly claim their milestones.

The how-to-play guide opens on your first visit. Dismiss it to start playing,
and use the **?** button in the header to reopen it anytime. It explains
merging, progression, the Roost, décor, Ash Trials, Blitz, and Stash equipment.
Progress is saved in this browser's local storage.

Rare Eggs place a guaranteed shiny egg on the home board. A 1h Time Skip adds
60 minutes of current Roost income to the Dragon Bank, up to its eight-hour cap.
Consumables stay in inventory when the board or bank is full, when no dragon is
perched for a Time Skip, or while a Trial is running.

## Code layout
- `game-data.js`: configuration, dragons, quests, rooms, and item definitions.
- `game-core.js`: saves, board operations, merging, and Ash Trial board rules.
- `app.js`: input handling, presentation, progression, and remaining game actions.
- `style.css`: interface styling.

The scripts load in that order from `index.html`; no build step is required.

## Run gameplay checks
Reward-inclusive results and assumptions are in [REWARD-PLAYTEST.md](REWARD-PLAYTEST.md).
Run `node scripts/reward-sim.cjs` for fresh, mid-game, and advanced reward scenarios.

Current tuning and pacing measurements are in [BALANCE-TUNING.md](BALANCE-TUNING.md).
The historical baseline is in [BALANCE-REVIEW.md](BALANCE-REVIEW.md).
Run `node scripts/balance-sim.cjs` to repeat the current seeded simulations without touching your save.

With Node.js 18 or newer installed, run this from the project folder:

```sh
node --test tests/game.test.cjs
```

The suite runs the production scripts with isolated in-memory saves, a controlled
clock, and minimal DOM doubles. It covers onboarding, merges, save round trips
and migration, energy, trial generation and clearing, rewards, and daily resets.
It does not change your browser save or verify browser layout/touch behavior.

For a browser check, open the game on desktop and mobile, open **?**, scroll the
guide, and dismiss it with its button (or Escape on desktop). Refresh to confirm
it stays dismissed. Gather and merge eggs, then check that the Stash and Trials
still respond normally.
