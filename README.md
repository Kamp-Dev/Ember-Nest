# Ember Nest

Merge + decorate prototype. Cozy dragon nest. **5-merge**.

## Play
Open `index.html` in a browser (phone or desktop).

## Loop
- **Gather** spends 1 energy. Discoveries improve the gathered dragon tier;
  basic eggs remain available for quests.
- Drag matching pieces onto each other to stack them.
- **5 of the same stage** become the next dragon and pay ember coins.
- Spend coins on nest decor. Each piece raises the merge coin bonus.

## Chain
Egg → Hatchling → Wyrmling → Young ember → Hearth dragon → Elder hearth

## Getting started
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
