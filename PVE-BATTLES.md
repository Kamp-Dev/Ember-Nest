# PvE Battle Lodge — campaign and combat presentation

Open **Battles** directly from the bottom navigation. Enlist one Hatchling or later-stage dragon from the Board, select a companion, then choose an encounter. Three campaign regions group the eight encounters; companion management has its own section. Entry preloads scenery and relevant Elder poses, then presents a versus arrival. Cancellation and late image callbacks are safe. This moves the actual dragon into a 12-slot roster. No duplicate, fee, energy cost, injury timer, or permanent loss. Return requires an empty unlocked Board tile.

**Goals** contains weekly contracts, the reward inbox, daily offering and token exchange, with direct links to mastery, the next tracked goal, campaign and expeditions. **Battles** also contains the collapsible Board challenges. Home is appearance/inventory; Board is merging; Roost is income; Nest is rooms/decor/collection. Existing Board goal shortcuts remain useful without being the only way to find rewards.

## Progression and safety

- Growth stage stays separate from individual battle training. Training caps: Hatchling 3, Wyrmling 5, Young 7, Hearth 9, Elder 12.
- Names, training XP, shiny status, element and skill choice travel with the dragon through return, re-enlistment, Roost, reserve, save/reload and backup export/import.
- Trained dragons are protected from ordinary merging, donation, dismissal and Element Prisms. Grow in the Lodge by consuming four **untrained Board dragons of the same stage and element**, keeping the trained companion. Hatchling growth awakens a random element, consistent with normal merging. No coin shortcut to battle levels.
- Lodge growth grants the standard one-promotion coin payout, Keeper XP, discoveries and contract credit. Level-up presentation waits until the Lodge closes; failed transactions also roll back queued level rewards.
- Guard first, otherwise speed decides action order. Tie favors player. Four skills, five stamina, three-turn heavy-skill cooldown. Elder training 3 unlocks a fourth-slot choice between damage and Renewal healing.
- Fire burns, Water weakens an attack, Nature slows and restores 6% HP. Element advantage +20%; disadvantage −15%; Neutral has neither.
- Eight PvE encounters. First clears add at most **1,915 coins per save in total**. Replays award XP, never additional coins. Overgrown dragons receive less XP in lower-stage encounters. XP stops at the stage cap; level 12 requires 1,760 total XP.
- Entry/retries/healing are free. Current fights are deliberately not saved; exit/reload abandons a fight with no new rewards. Completed victories commit rewards immediately. Failed writes roll back XP/coins and offer Retry saving rewards. Closing an unclaimed victory requires explicit discard confirmation.
- New ownership/progression transactions validate and roll back on failed writes or cross-tab conflicts. Backup validation rejects duplicated training IDs and malformed training records. Existing saves receive empty battle fields; no migration replaces existing dragons.

## Implementation

`battle-core.js` is a DOM/storage-free turn engine. `battle-state.js` owns training validation and transactional roster actions. `battle.js` handles modal presentation and cancellable animation callbacks. `battle.css` is isolated from Board/Home sizing. The tower-defense prototype is shelved: its scripts are no longer loaded; its original files and inert HTML template remain recoverable.

## Art and current limits

This is **2D combat, not a 3D model system**. Existing sprites breathe, lunge and react; code-native Fire, Water and Nature effects accompany skills. Motion follows the existing explicit Dragon & tile motion preference, defaults to the device's reduced-motion setting, and pauses when the page is hidden.

The Nature Elder has a four-pose sheet with actual head, wing and limb changes. Fire and Water Elders now swap from original idle art into separate casting poses, timed with projectiles and impacts. Water's generated checkerboard was removed with explicit user approval using `scripts/clean-battle-sprite.py`; light/dark composites verify the silhouette and preserved belly scales. Lower-stage and Neutral dragons retain whole-sprite motion, not independent limb rigs. Enemies are original animated SVG art; stone and water spirits have distinct silhouettes.

The introductory Mossling teaches a three-action loop. Other families have four-action tells with distinct brace, heavy and recovery turns. All mechanics are deterministic and telegraphed; they do not secretly scale against the player. Guard displays a floating shield and barrier; hits show damage and shield absorption; elemental moves add projectiles, rings, particles, roots/water impacts and status icons. Event snapshots prevent HP/guard/status from jumping to the end of the turn. Animation speed is 1×/2×, and the existing motion Off setting uses fast static feedback. Replay and the next eligible encounter are available from results. There is no PvP, paid currency, team swapping or new monetization. Broader skill trees, independent limb rigs for every stage, and post-cap battle rewards are not implemented by this presentation expansion.

## Verification

Run `node scripts/check-game.cjs` for syntax and regression checks. Run `node scripts/audit-battle.cjs` for deterministic encounter/build simulations (not human difficulty validation). Type disadvantage can require extra training in intermediate duels; all elements can clear the final fight at training 12 with an appropriate build.

Run `node scripts/preview-battle.cjs` and open `http://127.0.0.1:5500/tests/battle-audit.html` for an **isolated memory-only** browser fixture. It resets on refresh and never reads/writes a player's localStorage. Never use fixture progress as production save data.

Baseline browser coverage includes Hatchling and Nature Elder victories, motion Off, confirmed abandonment and light/dark layouts. Expansion regression gate: 196 passing tests, including exact event snapshots, loading cancellation, late callbacks, failed scenery/pose fallback, replay safety and unique Goals targets. Expansion browser checks include the loading screen, Guard barrier, Water Elder victory (+76 XP / +220 coins), level-2 roster return, 390×844 light combat and Goals layout, and 320×720 dark/motion-Off layout. Run the audit again after balance changes; deterministic simulations do not replace human playtesting.

### Expansion asset record

Built-in image generation produced `assets/battle/moonlit-arena-v1.png`, `assets/battle/fire-elder-attack-v1.png`, and the source for `assets/battle/water-elder-attack-v1.png`. Water alone received user-authorized local cleanup; source candidates remain untouched outside the repository. The `water-elder-attack-v1-qa.jpg` composite is a QA artifact, not loaded by the game.

Arena prompt: “Create a polished original hand-painted anime fantasy battle arena background for a cozy dragon game. Wide 3:2 landscape, empty woodland clearing at blue twilight, ancient mossy stone arch on right, luminous turquoise stream behind arena, warm amber fireflies, distant purple forest, layered atmospheric depth, beautifully textured painterly foliage. Bottom 40 percent is unobstructed flat earthy arena with TWO empty standing spaces left and right for combatants. No characters, no creatures, no UI, no lettering, no watermark. Gentle dramatic lighting, rich readable color, premium illustrated game environment, not photorealistic. Main background only, opaque image.”

Attack-pose prompt, with Fire/Water substituted and the corresponding `Images/elements/{element}-elder-1.png` as identity/style reference: “Create a single battle attack pose sprite of this EXACT elder dragon. Preserve every color, facial design, anatomy, horns, scales and wings. Full body facing right at same three-quarter angle. Change pose substantially: crouch forward, front legs firmly braced wider, head lowered and neck extended right with jaws open to cast a spell, wings swept back and tail curved left. Four anatomically correct legs, wings attached to upper back. Same polished hand painted anime game sprite with strong contours and painterly shading. Single isolated dragon centered with 8 percent padding, transparent background. No ground, no shadow, no environment, no grid, no text. Do not draw the projectile: spell effect will be animated separately in the game.”

## Generated asset / reproducible prompt record

Mode: built-in image generation, not CLI/API. Final shipped asset: `assets/battle/nature-elder-poses-v1.png` (1254×1254 RGBA, transparent exterior verified). Reference: `Images/elements/nature-elder-1.png` (identity and style reference).

Generation prompt (same base used for rejected Fire/Water candidates, replacing the element):

> Use case: stylized-concept. Asset type: production 2D game animation sprite sheet with genuine transparent alpha background. Input image 1 is the identity and exact art style reference of our Nature Elder dragon. Create exactly FOUR poses of this same dragon in a precise 2 by 2 grid of equal square cells, on a 1024x1024 canvas. No grid lines or text. Same fixed orthographic three-quarter view facing RIGHT, same scale and feet baseline in each cell, all wing/tail tips contained within each cell with 8% padding. Top left: calm ready stance. Top right: attack anticipation, forelimbs flex, head pulls back, wings raised. Bottom left: release attack, head and neck stretch forward, mouth open, wings sweep down, forelimb forward. Bottom right: recover with limbs and wings relaxing toward ready stance. Keep anatomy exactly the original (four legs plus two wings), horns, colors, proportions and hand-painted anime fantasy rendering. Do not redesign dragon. No breath projectile or floor or scenery or shadows outside character: effects added by code. Output genuinely transparent, not a checkerboard. Uniform cell alignment is essential for animation.

Accepted Nature extraction prompt:

> Use case: background-extraction. Image 1 is the EDIT TARGET, a 2x2 animation sheet. Remove the visible gray and white checkerboard completely. Output a PNG with genuine transparent ALPHA CHANNEL (alpha=0 outside dragons), not a picture of checkerboard. Keep all four dragon poses and their style and colors. Fit each entire dragon into its own equal square quadrant with 10% transparent padding so no body, tail or wing crosses the midlines. Do not add any backdrop, grid, text, outlines or new elements. No white matte. Actual transparent pixels are required for game rendering.
