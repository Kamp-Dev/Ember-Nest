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
