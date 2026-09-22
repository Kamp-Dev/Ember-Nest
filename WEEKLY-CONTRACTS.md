# Weekly contracts

Five local-calendar contracts replace the repeatable nest requests and five-gift
milestone. Sets reset at Monday 00:00 local time. Difficulty is based on permanent
dragon discovery at generation, then stays fixed until the next reset. Returning
after several weeks creates only the current set, without retroactive rewards.

Goals cover successful home gathers and promoted dragons, with Trial clears after
a prior Trial victory and a lower-tier donation after a prior dragon discovery.
Some slots deliberately share a goal type for new players who lack other systems.
Targets vary modestly by calendar week. Home gathers progress every gather goal;
shop dragons and stacking without promotion do not count. Blitz counts as a clear.
Donation consumes one board dragon, never the highest discovered tier.

One unclaimed contract can be replaced per week. Replacement changes its activity,
resets its progress, and preserves its payout. Claimed contracts cannot be replaced.
Claims and replacement actions reject stale week keys and cannot execute in Trials.
Each contract pays 200 + 100 × discovery tier, without décor multipliers. Claiming
all five pays another 500 coins and one persistent cosmetic token. Tokens currently
can be spent in the contracts panel on Tide Crown and Grove Crown frames, one token
each. Ember Crown is a free one-time claim. All three equip through The Stash.
Unclaimed completed contracts expire at reset. Claimed rewards and tokens remain.

Existing saves preserve coins, dragons, inventory and bank balances. Old quest
counters are inert and no old gift milestone is replayed. Sleepy Dragon remains
an independent daily offering. The browser's local clock is authoritative in this
offline prototype; server-verified time and multi-tab save conflict handling are
not introduced by this change.

Verification: 44 automated tests, including calendar boundary rollover, stale
claims, no duplicate payouts, persistent tokens and replacement limits, donation
consumption, successful-only activity tracking, Blitz, and opening/closing the
panel. A narrow-screen browser smoke check verified opening, scrolling layout and
replacement disabling. Full touchscreen interaction has not been device-tested.

The reward-inclusive script now exercises contracts. In 30-seed fresh-save runs,
median Elder timing was 94.1 simulated minutes without shopping and 61.9 with
shopping. Fresh contract payouts capped at 1,500 total that week, versus 4,000
for a set generated at Elder tier. These policy simulations do not predict human
session length or weekly retention. The first three cosmetic frames are available;
additional endgame activities remain a future pass.
