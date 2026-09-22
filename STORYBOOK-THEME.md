# Woodland storybook theme

The presentation layer is `storybook.css`, loaded after the existing game stylesheet in `index.html`. It is scoped to `body.storybook`. Gameplay scripts, saves, progression, sprite sizes, and reward rules are unchanged by this restyle.

The palette uses cream paper, sage and moss greens, terracotta primary actions, and muted grey empty Stash slots. The five main screens, navigation, contracts, mastery, picker/customizer dialogs and Dragon Book controls share this treatment. Existing book artwork and dragon sprites remain intact. Room selections vary the board tile tint. Focus outlines and reduced-motion preferences are supported.

## Background artwork

Project asset: `assets/theme/forest-sanctuary-v1.png`.

Generated using the built-in imagegen tool (not the CLI), then copied into the project. Original remains at the generator output location.

Final prompt:

> Use case: illustration-story. Asset type: background painting for Ember Nest, a cozy dragon-raising mobile game. Create an original hand-painted Japanese animated fantasy woodland sanctuary, nostalgic watercolor and gouache animation-background style. Wide landscape composition: softly sunlit mossy forest framing an inviting little timber dragon keeper cottage with terracotta roof, winding stone path, wildflowers, distant blue-green hills and warm cream clouds. Rich natural leafy greens, gentle golden sunlight, warm wood and terracotta; charming hand-drawn edges and painterly detail. Quiet pale atmospheric center, richer foliage at outer edges, readable as a subdued UI backdrop. No characters, dragons, lettering, interface, logos or watermarks. Landscape 1536x1024.

## Verification

- Existing 57 game tests and 3 sprite checks pass.
- Browser inspection of all five screens, contracts, Dragon Book and mastery; desktop and 390px phone layouts checked.
- Fixed legacy fixed-height clipping, mobile navigation overflow, and book arrow contrast within the theme layer.
- Saved locally; no deployment or Git push performed.

## Board/header layout correction

The board now has a keyboard-focusable `.board-playfield` scroller and a separate, non-shrinking action dock. Navigation participates in the app's flex layout instead of overlaying content. Removed the old global wheel-event cancellation, which blocked both board and modal scrolling. Dragon tiles retain their size; shorter displays scroll the playfield without moving Gather, Buy, or Auto Merge offscreen.

The header has a title/tools row and a dedicated three-column resources row. Long names truncate in their own column; large resource values can wrap instead of colliding with controls. Browser checks covered desktop and 320px/390px mobile sizes, action visibility/hit-testing, wheel scrolling, and an actual Gather in the test browser. A structural regression test protects the dock/header separation.

## Moonlight appearance

The header moon/sun button alternates light and dark palettes. Light remains the default. The `ember-nest-appearance` localStorage preference is restored before paint and is independent of game saves and selected rooms. If browser storage is blocked, switching still works for the current visit. `moonlight.css` changes palette/artwork only; shared layout and dragon artwork remain untouched. The Dragon Book keeps its illustrated parchment pages, with dark surrounding controls.

Night artwork: `assets/theme/forest-sanctuary-night-v1.png`, generated with the built-in imagegen editing tool using the daytime painting as its reference. Both project assets are retained.

Final edit prompt:

> Use case: lighting-weather. Edit target: supplied woodland sanctuary painting. Create its matching nighttime version for a cozy dragon game dark theme. Preserve the exact cottage, path, trees, lake, distant village and hills, composition, hand-painted Japanese animation watercolor/gouache style and landscape dimensions. Change daylight to tranquil moonlight: deep indigo sky, tiny stars, cool teal forest shadows, soft silver-blue highlights on leaves, path and lake. Warm amber light glowing from cottage windows and the existing lantern. Cozy and inviting, not horror, sufficiently dark for a night-mode backdrop yet detailed and readable. No text, interface, characters, dragons or watermark. Keep daytime original unchanged; output a new nighttime image.

Added a regression test for toggling, preference restoration, invalid values, blocked storage, and unchanged game state. Browser checked dark Board, Home, Roost, contracts and Dragon Book, refresh persistence, and the 320px header/action dock.
