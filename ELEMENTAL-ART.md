# Elemental art

Generated with the built-in image generator using the imagegen skill. No original
artwork was overwritten. With user approval, local Pillow/numpy processing removed
baked backgrounds and split the selected artwork into transparent PNGs.
ELEMENTAL_ASSETS_READY=true enables the completed collection.

## Saved assets

- Images/elements/fire-atlas-v1.png: RGBA, transparent corner verified.
- Images/elements/nature-atlas-v1.png: RGBA, transparent corner verified.
- assets/elemental-drafts/: unchanged generation sources, not used at runtime.
- Images/elements/{fire,water,nature}-{wyrmling,young,hearth}-{1,2,3,4}.png
- Images/elements/{fire,water,nature}-elder-1.png
- assets/avatar/border_{ember,tide,grove}_v1.png

The original 1254-square water draft is preferred over subsequent failed cleanup
variants. The 39 numbered dragon sprites and three frames are 512-square RGBA.
Elder cannot merge and has no extra stack images. Eggs and Hatchlings are unchanged.
Dragon subjects are centered and scaled to a 480px longest edge on each 512px
canvas, matching the visual footprint of the original Hatchling art. Explicit
resizing (not shrink-only thumbnailing) prevents Wyrmlings looking smaller after
merging. Nearly invisible alpha specks are excluded from subject measurements.
Run footprint regression checks with
`python -B -m unittest discover -s tests -p test_elemental_art.py`.
Rebuild with `python scripts/prepare-elemental-art.py` (Pillow and numpy required).
The script checks transparent corners and portrait openings and writes
tests/elemental-contact-sheet.png. tests/art-preview.html is a browser gallery.

## Prompt set

### Fire Wyrmling front-leg correction

Built-in imagegen edited the Fire Wyrmling using Water and Nature only as body-plan
references. Prompt: preserve Fire's face, large amber eyes, flame-tipped horns,
copper/obsidian colors, orange wing membranes, curled flame tail and compact
painted style. Add two distinct short forelegs descending from the chest, with
elbows and paws separate from both hind legs: four legs plus two wings. Produce
one 2x2 sprite sheet with one/two/three/four copies, full silhouettes, transparent
background, no lettering or scenery. Source: `assets/elemental-drafts/fire-wyrmling-v2-source.png`.
The existing approved background-cleanup/export pipeline produces
`Images/elements/fire-wyrmling-{1,2,3,4}.png`; older Fire stages remain unchanged.

### Water Wyrmling anatomy revision

Current selection: `assets/elemental-drafts/water-wyrmling-v4-source.png`, with
single-character concept `water-wyrmling-v4-concept.png` in the same directory.
The v3 realistic design was rejected for departing from the established style;
v2 and v3 are retained only as drafts and are not used by the export pipeline.

V4 built-in prompt sequence: use Fire Wyrmling as the primary compact-body,
round-head, chunky-paw, soft-painted style template and Nature as a same-game
style reference. Create its turquoise/sapphire Water sibling with pearl belly,
small ivory horns, aqua shoulder-mounted wings and a separate smooth tail;
avoid realism, long limbs, huge cheek fins and bubbles. Refine the lower body
to show four distinct short legs and paws while retaining the face, wings and
style. Finally duplicate that design into a 2x2 sheet of one/two/three/four
dragons. Actual RGBA transparency was returned for the final sheet. The existing
local exporter preserves alpha, crops each group and normalizes its visible size.
Runtime files: `Images/elements/water-wyrmling-{1,2,3,4}.png`.

Previous V2 attempt (superseded):

Built-in image generation produced `assets/elemental-drafts/water-wyrmling-v2-source.png`.
The existing user-approved local cleanup/export pipeline extracts its four quadrants
into the four stack sprites before V4 replaced it.
Older Water stages and all other elements keep their previous source artwork.

Prompt: use the original Water Wyrmling as character/color reference and the Fire
Wyrmling as painted-style/anatomy reference. Correct the wing roots to the upper
back behind the neck and forelegs; use two proportionate webbed wings, four legs,
and a distinct curling tail with a small fin. Preserve turquoise/sapphire scales,
pearl belly, blue eyes and ivory/coral horns. Remove floating bubbles. Produce a
2x2 sprite sheet with exactly one, two, three, and four matching Wyrmlings, full
bodies contained within each quadrant; no lettering, scenery or floor shadow.
Transparent alpha requested; baked checkerboard removed during local export.

Style references: Images/wyrmling-2.png and Images/hearth-1.png for dragons;
assets/avatar/border_obsidian.png for portrait frames. Inputs were inspected first.

Dragon generation spec: hand-painted fantasy sprite atlas, square, exact 4×4
equal cells. Rows Wyrmling / Young / Hearth / Elder; columns one / two / three /
four dragons of the same stage. Whole bodies, horns, wings and tails inside their
cell with padding. Groups shrink to fit. No lettering or scenery. Genuine alpha.
Fire: copper/obsidian scales, flame membranes, ember cracks and fiery horn tips.
Water: turquoise/sapphire, pearl belly, aquatic fins, coral horns, webbed wings.
Nature: moss/emerald scales, cream belly, wooden antlers, leaf wings and vines.

Successful fire cleanup prompt:
"Use case: background-extraction. Image1 is the EDIT TARGET. Preserve every
dragon, exact positions, 4x4 grid, colors, scale and geometry. Remove the entire
fake white/gray checkerboard background and replace it with ACTUAL TRANSPARENT
ALPHA PIXELS. Output must be RGBA PNG with zero-alpha background, not an RGB image
depicting transparency. No checker pattern anywhere. Clean isolated edges, no
outlines around empty cells. Do not repaint or move dragons. This is background
removal only."

Frame generation spec: one square ornate dragon portrait border matching the
reference geometry, outer ornament within 8–92%, portrait opening at 24–76%,
hand-painted fantasy style, upper-corner dragon heads, no lettering or portrait.
Actual transparent center and exterior requested. Ember: volcanic stone/copper,
orange flame accents, ruby. Tide: silver/turquoise waves, coral horns, blue pearl.
Grove: twisted wood, emerald leaves, antlers and green crystal.

Cleanup retries for water and frames did not produce valid alpha and were not
selected. Their tool-generated source files remain in the Codex generated-images
directory; selected drafts above are saved in the repository for continuation.

## Integration

Element-aware board, Roost, picker, drag preview and Dragon Book rendering; shiny
glow retained. Neutral and Hatchling assets unchanged. Three catalog frame items
use the existing equip/unequip flow. Ember is a one-time free claim; Tide and Grove
each cost one weekly token. Claims track persistent redemption to prevent repeats.
Automated tests cover asset presence/format, element routing, Elder stack clamping,
one-time frame claims, token spending, save persistence and Stash equip/unequip.
All 47 automated tests pass. The contact sheet was visually inspected on the
game's dark background. Browser verification loaded all 42 assets, confirmed the
free claim becomes owned, and checked portrait fit plus Stash equip/unequip.
No browser console errors were observed during that flow.
