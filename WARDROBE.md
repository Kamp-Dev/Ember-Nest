# Keeper wardrobe — September 2026

## Canonical rarity palette

The supplied rarity chart defines the exact accent colors. Backgrounds use opaque theme-appropriate shades of these colors; clothing artwork is unchanged. Future tiers are reserved design notes only, not active catalog entries, rewards, or progression gates.

| Tier | Accent | Status |
|---|---|---|
| Common | #FDFEFE | Active |
| Uncommon | #27AE60 | Active; static tiles |
| Rare | #2471A3 | Active |
| Epic | #7D3C98 | Active |
| Legendary | #F1C40F | Active |
| Mythic | #D35400 | Active |
| Relic | #7B241C | Reserved for later |
| Masterwork | #B3CA1F | Reserved for later |
| Eternal | #DC2367 | Reserved for later |

15 permanent cosmetic items, in five three-piece sets. All assets were generated with the built-in imagegen tool using body_base.png and torso_tunic.png as keeper/style references. Original generated alpha PNGs are preserved; CSS positioning fits them to the existing keeper. No changes to coins, energy, dragon stats, or XP pacing.

## Where to find them

Home → The Stash → Wardrobe milestones shows every unlock and progress. Earned items are automatically added once. Click a tile to inspect, then Equip, Replace, or Unequip. Optional Quick equip mode restores click-to-toggle behavior. Click the keeper to open the full-body Mirror. Sets can be mixed.

| Rarity / set | Head | Torso | Legs |
|---|---|---|---|
| Uncommon · Woodland Apprentice | Level 2 | Level 3 | Level 5 |
| Rare · Spring Traveler | Level 10 | First claimed weekly contract | Level 15 |
| Epic · Star Scholar | One completed contract week | Complete Ash Trial | Level 30 |
| Legendary · Ember Guardian | Claim Fire mastery | Claim Water mastery | Claim Nature mastery |
| Mythic · Celestial Warden | Level 75 | Claim all three Radiant masteries | Eight completed contract weeks |

Weeks need not be consecutive. Existing recorded levels, Trial completion, mastery claims, current/prior saved contract claims, and completed-week history count retroactively. Unrecorded historical weeks cannot be reconstructed. Unlocks never expire and never auto-equip or replace worn clothing. A permanent wardrobeClaims ledger prevents repeated grants.

## Rarity effects

Animated Tiles is now an explicit, saved game preference in the portrait settings, enabled by default for the requested motion update. On overrides reduced-motion only for tile backdrops, sheen, and particles; other UI still respects the system preference. Off disables all tile motion. Higher tiers add faster sheen, floating particles, and multicolor holographic highlights. Browser checks confirmed changing wave transforms with reduced-motion enabled and no animations after switching Off.

The header portrait opens appearance, sound, and help in a dismissible settings popover; only the Home model opens the Mirror. The Book sits immediately before coins. Stash tabs are All, Clothing, Frames, and Items. Animated backgrounds differ per rarity: common breathing glow, uncommon drifting green bands, rare blue ripples, epic rotating purple nebula, legendary gold rays, and mythic multicolor aurora. All run behind item art, use transform/opacity, pause off Home, and stop under reduced-motion preferences.

Uncommon: moss-green raised border. Rare: blue border and slow shine. Epic: purple border, shine and twinkles. Legendary: gold border, shine and rising motes. Mythic: rose/teal double rim, shine and floating stars. Rarity is also written on each tile. CSS-only effects use transform/opacity with at most three motes; reduced-motion preferences disable animation. Both light and dark palettes supported. Empty gray slots remain.

## Art and prompts

Workspace folder: assets/avatar/. Filenames below are the actual shipped files. The Legendary head's first result had a baked checkerboard; a built-in imagegen background-extraction edit replaced it with genuine transparent alpha while preserving the cap.

### uncommon_torso

File: assets/avatar/clothing_uncommon_torso_v1.png

Prompt: Moss-green woodland apprentice short sleeved tunic. Front facing transparent clothing sprite matching body_base.png and torso_tunic.png. Warm hand-painted Japanese fantasy animation, cream collar and trim, leaf embroidery, brown belt and pouch. No person or background.

### uncommon_legs

File: assets/avatar/clothing_uncommon_legs_v1.png

Prompt: Use case: stylized-concept. Isolated equippable clothing sprite for chibi keeper in reference 1. Reference 2 is style only. ONLY a connected pair of woodland apprentice brown trousers with moss-green cuffs and rounded leather boots. Short chibi legs, front facing, slightly apart. No torso, belt above waist, person or skin. Cozy hand-painted Japanese fantasy animation aesthetic, soft cel shading, warm hand-drawn outlines, simple charming game art matching references. Neutral front view, entire garment visible tightly centered on square TRANSPARENT canvas occupying 88% width or height. Genuine alpha, no background, checkerboard, text, ground or cast shadow. Single equipment item only, not sprite sheet.

### uncommon_head

File: assets/avatar/clothing_uncommon_head_v1.png

Prompt: Use case: stylized-concept. Isolated equippable clothing sprite for chibi keeper in reference 1. Reference 2 is style only. ONLY a moss-green woodland apprentice soft round traveling cap, cream band, one small leaf tucked into band. Front facing, wide low crown, no face, hair or person. Cozy hand-painted Japanese fantasy animation aesthetic, soft cel shading, warm hand-drawn outlines, simple charming game art matching references. Neutral front view, entire garment visible tightly centered on square TRANSPARENT canvas occupying 88% width or height. Genuine alpha, no background, checkerboard, text, ground or cast shadow. Single equipment item only, not sprite sheet.

### rare_torso

File: assets/avatar/clothing_rare_torso_v1.png

Prompt: Use case: stylized-concept. Isolated equippable clothing sprite for chibi keeper in reference 1. Reference 2 is style only. ONLY a spring traveler blue short-sleeved tunic with cream collar, wave embroidery, leather belt and small pouch. Sleeves angle down outward. No arms, body or skin. Cozy hand-painted Japanese fantasy animation aesthetic, soft cel shading, warm hand-drawn outlines, simple charming game art matching references. Neutral front view, entire garment visible tightly centered on square TRANSPARENT canvas occupying 88% width or height. Genuine alpha, no background, checkerboard, text, ground or cast shadow. Single equipment item only, not sprite sheet.

### rare_legs

File: assets/avatar/clothing_rare_legs_v1.png

Prompt: Use case: stylized-concept. Isolated equippable legs clothing sprite for chibi keeper in reference 1; reference 2 style only. ONLY connected pair of blue spring traveler trousers with cream wave embroidered cuffs and rounded dark blue leather boots. Short chibi legs, slightly apart. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming handmade fabric. Same style as reference. Neutral FRONT facing view, entire item visible centered tightly on square transparent canvas occupying 88% of width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### rare_head

File: assets/avatar/clothing_rare_head_v1.png

Prompt: Use case: stylized-concept. Isolated equippable head clothing sprite for chibi keeper in reference 1; reference 2 style only. ONLY blue spring traveler soft round cap, cream wave embroidered band and small silver droplet pin. Wide low crown. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming handmade fabric. Same style as reference. Neutral FRONT facing view, entire item visible centered tightly on square transparent canvas occupying 88% of width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### epic_torso

File: assets/avatar/clothing_epic_torso_v1.png

Prompt: Use case: stylized-concept. Isolated equippable torso clothing sprite for chibi keeper in reference 1; reference 2 style only. ONLY plum-purple star scholar short-sleeved tunic with ivory collar, subtle golden star embroidery, brown leather belt and little book pouch. Sleeves slope down outward. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming handmade fabric. Same style as reference. Neutral FRONT facing view, entire item visible centered tightly on square transparent canvas occupying 88% of width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### epic_legs

File: assets/avatar/clothing_epic_legs_v1.png

Prompt: Use case: stylized-concept. Isolated equippable legs clothing sprite for chibi keeper in reference 1; reference 2 style only. ONLY connected pair of plum-purple star scholar trousers with ivory cuffs, little gold star stitching and rounded plum leather boots. Short chibi legs slightly apart. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming handmade fabric. Same style as reference. Neutral FRONT facing view, entire item visible centered tightly on square transparent canvas occupying 88% of width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### epic_head

File: assets/avatar/clothing_epic_head_v1.png

Prompt: Use case: stylized-concept. Isolated equippable head clothing sprite for chibi keeper in reference 1; reference 2 style only. ONLY plum-purple star scholar soft round cap with ivory band, golden crescent moon brooch and tiny star embroidery. Wide low crown. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming handmade fabric. Same style as reference. Neutral FRONT facing view, entire item visible centered tightly on square transparent canvas occupying 88% of width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### legendary_torso

File: assets/avatar/clothing_legendary_torso_v1.png

Prompt: Use case: stylized-concept. Isolated equippable torso clothing sprite for chibi keeper in reference 1; reference 2 is style reference only. ONLY an amber-orange Ember Guardian short-sleeved tunic, ivory collar, gold flame embroidery and dragon-shaped bronze belt buckle. Sleeves slope down outward. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming fabric shapes, richly detailed but not photorealistic. Same charming style as references. Neutral FRONT facing view, entire item visible tightly centered on square transparent canvas occupying 88% width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### legendary_legs

File: assets/avatar/clothing_legendary_legs_v1.png

Prompt: Use case: stylized-concept. Isolated equippable legs clothing sprite for chibi keeper in reference 1; reference 2 is style reference only. ONLY connected pair of amber-orange Ember Guardian trousers, ivory cuffs with gold flame embroidery, rounded dark brown boots with bronze accents. Short chibi legs slightly apart. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming fabric shapes, richly detailed but not photorealistic. Same charming style as references. Neutral FRONT facing view, entire item visible tightly centered on square transparent canvas occupying 88% width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### legendary_head

File: assets/avatar/clothing_legendary_head_v1.png

Prompt: Use case: stylized-concept. Isolated equippable head clothing sprite for chibi keeper in reference 1; reference 2 is style reference only. ONLY an amber-orange Ember Guardian soft round cap, ivory band with golden flame embroidery, small golden dragon-wing brooch. Wide low crown. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming fabric shapes, richly detailed but not photorealistic. Same charming style as references. Neutral FRONT facing view, entire item visible tightly centered on square transparent canvas occupying 88% width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### mythic_torso

File: assets/avatar/clothing_mythic_torso_v1.png

Prompt: Use case: stylized-concept. Isolated equippable torso clothing sprite for chibi keeper in reference 1; reference 2 is style reference only. ONLY ivory Celestial Warden short-sleeved tunic with deep teal collar and trim, delicate gold celestial leaf embroidery, small luminous teal gem belt buckle. Handcrafted magical fabric, not armor. Sleeves slope down outward. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming fabric shapes, richly detailed but not photorealistic. Same charming style as references. Neutral FRONT facing view, entire item visible tightly centered on square transparent canvas occupying 88% width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### mythic_legs

File: assets/avatar/clothing_mythic_legs_v1.png

Prompt: Use case: stylized-concept. Isolated equippable legs clothing sprite for chibi keeper in reference 1; reference 2 is style reference only. ONLY connected pair of ivory Celestial Warden trousers with deep teal cuffs, delicate gold celestial leaf embroidery and rounded teal leather boots with tiny teal gem clasps. Short chibi legs slightly apart. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming fabric shapes, richly detailed but not photorealistic. Same charming style as references. Neutral FRONT facing view, entire item visible tightly centered on square transparent canvas occupying 88% width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

### mythic_head

File: assets/avatar/clothing_mythic_head_v1.png

Prompt: Use case: stylized-concept. Isolated equippable head clothing sprite for chibi keeper in reference 1; reference 2 is style reference only. ONLY ivory Celestial Warden soft round cap, deep teal band, gold celestial leaf embroidery and central luminous teal gem brooch. Wide low crown, magical handcrafted fabric, not armor. Cozy hand-painted Japanese fantasy animation, warm outlines, soft cel shading, simple charming fabric shapes, richly detailed but not photorealistic. Same charming style as references. Neutral FRONT facing view, entire item visible tightly centered on square transparent canvas occupying 88% width or height. Genuine alpha transparency. No body, skin, head, face, hands, mannequin, extra garments, background, checkerboard, text, ground shadow. One equipment item only, not sprite sheet.

## Wardrobe polish and worn hats

Home now follows a character/equipment/inventory layout: a full-body keeper with four equipped-slot cards beside it, category tabs, and consistently sized item tiles. Explicit grid row heights fix the collapsed-row bug caused by absolutely positioned artwork. Selecting an item defaults to inspection; its card shows rarity, slot, ownership, source/use, and the currently worn item when replacing clothing. Equip/Replace/Unequip/Use actions preserve existing inventory rules. Quick equip remains optional under Filter & sort. Rewards and milestones remain below the inventory. No combat stats, upgrading, or currencies were added from the visual references.

New unlocks are queued persistently and revealed on Home, with Equip now, Keep in Stash, and Keep all options. Closing a reveal leaves it available through the reward inbox. Already claimed items are not granted again, and Equip now never toggles off an already-worn reward.

The Stash supports category filters, equipped-first/name/rarity sorting, and an optional Inspect mode with item details. Quick equip retains click-again-to-unequip. Home highlights the unfinished wardrobe milestone with the highest completion ratio, with a link to the full milestone journal.

All five hats now have separate worn-only sprites generated with built-in imagegen. Inventory icons and saved equipment filenames remain unchanged. The renderer substitutes the worn art and calibrated placement for both the portrait and Mirror. This fixes the empty-cap underside/back flap without introducing a 3D renderer or changing the established hand-painted 2D style.

Shipped transparent RGBA assets:

- assets/avatar/clothing_uncommon_head_worn_v2.png
- assets/avatar/clothing_rare_head_worn_v2.png
- assets/avatar/clothing_epic_head_worn_v2.png
- assets/avatar/clothing_legendary_head_worn_v2.png
- assets/avatar/clothing_mythic_head_worn_v2.png

Art edit direction: preserve the original tier's colors, embroidery, and warm Japanese fantasy illustration style; use an eye-level front view with one curved forehead edge; remove the hollow opening, underside, and rear band. Original hats and keeper body were references. The clean rare silhouette was also used as a geometry reference for matching variants.

Variant prompt: “Use case: precise-object-edit. Image 1 is the exact FRONT-FACING silhouette and transparent background to preserve. Image 2 is color and decoration reference only. Change image 1 to [tier palette and decoration]. Keep image 1's clean single curved front lower edge, NO underside, rear band or opening. Keep its actual transparent alpha background intact. Single isolated hat. Hand-painted Japanese fantasy game style. Transparent PNG, no background or checkerboard graphic.” Palettes: moss green/cream with leaf; blue/cream with droplet; plum/ivory with moon and stars; amber/cream with gold flame and wing brooch; ivory/teal with gold leaves and central gem.

Final background-correction prompt where needed: “Create a transparent-background cutout PNG of this exact hat. Remove the background completely using actual alpha transparency. Keep the hat and all its details unchanged. The final file must have a real alpha channel, with alpha zero everywhere outside the hat, including below its curved lower band. Do not substitute a black, white, or checkerboard background. No face or head.” All shipped files were checked for real alpha transparency.

Run `node scripts/preview-wardrobe-polish.cjs` to regenerate the interactive browser fixture. It overrides storage with an in-memory test save before loading production scripts; it never reads or overwrites the player's real save. Reloading resets this fixture. Browser checks cover reward acknowledgment, already-worn rewards, inspection, equipping, Mirror fit, and narrow-screen layout.

### Test commands

### Animated texture refresh — September 22

Epic retains violet water caustics. Legendary now uses original liquid-gold marbling; Mythic uses original cyan/mint/violet energy filaments with its orange rarity border unchanged. Opaque PNG bases drift with bounded CSS transforms; separate highlights add motion. Animated Tiles Off freezes both layers, and hidden Home tiles pause. These are animated textures, not fluid simulations.

Saved assets (generated originals preserved):
- `assets/theme/rarity-legendary-flow-v1.png`
- `assets/theme/rarity-mythic-energy-v1.png`

Legendary generation prompt: Use case: stylized-concept. Original square fantasy game inventory background texture: warm liquid gold flowing in broad elegant marbled ribbons, amber pools, fine champagne-gold reflective highlights, a few tiny luminous flecks. Overhead view of luxurious molten golden water, smoothly flowing organic currents, not a bubbly or rocky texture, not rings or straight lines. Distinct sweeping marble-flow design rather than ordinary water caustics. Dark bronze base, quieter center for readable foreground item. Full bleed opaque background, no objects, no border, no text, no logo, no watermark.

Mythic generation prompt: Use case: stylized-concept. Create an original square fantasy game inventory background texture: delicate branching luminous cyan and mint energy filaments, violet wisps, glowing electric rivers and flowing translucent silk-light over a deep midnight navy background. Intricate fine tendrils, organic currents, premium ethereal detail, brighter edges and quieter center to keep an item icon readable. Flat full-bleed texture, no objects, no frame, no words, no logos, no watermark. Opaque background. Intended for subtle animated panning in a tiny Mythic item tile. Not a geometric line pattern.

### Verification commands

### Full rarity material ladder

Mythic palette revision: built-in image generation edited the existing energy texture into orange/copper, preserving its composition. Active asset: `assets/theme/rarity-mythic-energy-orange-v2.png`. Both animation layers now use this opaque texture; sheen and stars use peach/ivory. Border remains #D35400; Legendary remains gold. Original v1 retained.

Final edit prompt: Use case: precise-object-edit. Edit target: the supplied fantasy inventory texture. Preserve the exact composition, flowing ribbons, fine branching energy filaments, tiny luminous specks, quiet dark center, and opaque full-bleed square background. Change ONLY its palette: Mythic burnt orange #D35400 as the dominant hue, vivid ember-orange and copper currents, warm peach and ivory pinpoint highlights, deep dark burnt-umber background. Remove ALL cyan, blue, green, and violet hues. Orange/copper must dominate, not yellow gold (reserved for Legendary). No new objects, text, border, watermark, or symbols. Retain fine premium detail and foreground-item readability.

Generated with the built-in image-generation tool. Common is static matte pearl; Uncommon is static jade with no sheen; Rare has one slow blue-glass drift (18s); Epic adds amethyst flow (13s), an occasional sheen, and two sparkles. Legendary and Mythic retain their layered gold/energy finishes. All six texture bases are opaque in both themes. Motion-off freezes every animated layer.

Saved assets and final prompts:

common: `assets/theme/rarity-common-pearl-v1.png`

Use case: stylized-concept. Original square fantasy game inventory background texture: pale silver-gray matte pearl surface, extremely faint broad cloudy variation, almost plain, lowest rarity, no glow, no intricate grain or lines. Full-bleed opaque surface, quiet center for a foreground item icon, premium softly painted fantasy finish. No objects, border, words, logo, watermark, symbols, or geometric design. Texture only; must read clearly at 100 pixels.

uncommon: `assets/theme/rarity-uncommon-jade-v1.png`

Use case: stylized-concept. Original square fantasy game inventory background texture: subdued emerald and forest-green polished jade, a few very soft broad mineral swirls, low contrast and simple, no veins or luminous details. Full-bleed opaque surface, quiet center for a foreground item icon, premium softly painted fantasy finish. No objects, border, words, logo, watermark, symbols, or geometric design. Texture only; must read clearly at 100 pixels.

rare: `assets/theme/rarity-rare-glass-v1.png`

Use case: stylized-concept. Original square fantasy game inventory background texture: sapphire blue frosted glass with two or three soft broad flowing underwater currents, restrained gentle blue highlights near edges, clean sparse design, no intricate veins or stars. Full-bleed opaque surface, quiet center for a foreground item icon, premium softly painted fantasy finish. No objects, border, words, logo, watermark, symbols, or geometric design. Texture only; must read clearly at 100 pixels.

epic: `assets/theme/rarity-epic-amethyst-v1.png`

Use case: stylized-concept. Original square fantasy game inventory background texture: amethyst violet liquid silk and flowing translucent purple water, elegant curved ribbons and a few fine lilac reflective filaments near edges, medium detail, richer than plain blue glass but simpler than intricate molten gold, no stars or lightning. Full-bleed opaque surface, quiet center for a foreground item icon, premium softly painted fantasy finish. No objects, border, words, logo, watermark, symbols, or geometric design. Texture only; must read clearly at 100 pixels.


## Fitted clothing pass — September 22, 2026

All eight tunics now use separate worn artwork. Inventory thumbnails and saved item filenames stay unchanged. Home, the Mirror and the header use the same percentage-based fitting function. The body shirt is masked only while a torso item is equipped, preserving the neck and arms; the trousers mask remains independent. Existing fitted hats and legwear are retained and checked with the new hems, including mixed outfits and unequipped slots. No 3D model or save migration is required.

New assets (all PNGs with an alpha channel):

- `assets/avatar/clothing_uncommon_torso_worn_v2.png`
- `assets/avatar/clothing_rare_torso_worn_v2.png`
- `assets/avatar/clothing_epic_torso_worn_v2.png`
- `assets/avatar/clothing_legendary_torso_worn_v2.png`
- `assets/avatar/clothing_mythic_torso_worn_v2.png`
- `assets/avatar/torso_tunic_worn_v2.png`
- `assets/avatar/torso_tunic_rare_worn_v2.png`
- `assets/avatar/torso_tunic_epic_worn_v2.png`

Image-generation prompts for accepted assets:

Uncommon, using the existing uncommon inventory tunic and body as references:

> Use case: precise-object-edit. Image 1 is the clothing DESIGN to preserve; Image 2 is BODY/POSE reference only. Make a worn-front overlay of the green tunic for this Keeper: fitted narrow shoulders, sleeves hanging downward around relaxed upper arms, believable fabric drape and seams, short hem at hips, original green/cream embroidery and belt. Remove visible rear collar rim and hollow dark neck interior: a shallow curved FRONT neckline with genuinely transparent opening for the character neck. No open sleeve tubes, no hanger, no mannequin, no skin, no character. Output ONLY the garment, centered and large in a square canvas with genuine alpha transparency around it and in the neckline. Keep the established soft painted anime-fantasy style, no new design. Need a fitted wearable overlay, not flat-lay merchandise.

Rare, Epic and Mythic, using the respective inventory tunic, the accepted Uncommon cutout and the body:

> Create a transparent cutout game sprite of ONLY the tunic. Match the garment design and colors of image 1. Use the fitted shape and front-only neck construction from image 2. Fit the Keeper pose in image 3. No character, no skin, no backdrop. True transparent background. A single shallow U neckline with opaque matching undershirt inside any V slit below that shallow neckline. Sleeves point downward for relaxed arms. Preserve the painterly fantasy garment design from image 1. No mannequin, no background pattern.

Legendary, using the inventory tunic and body:

> Use case: precise-object-edit. Image 1 is the inventory tunic DESIGN; image 2 is the Keeper BODY reference only. Create ONLY a fitted wearable front-layer tunic, no person or skin. Match the existing colors, embroidery, belt, trim and soft painted anime-fantasy style. Shoulders narrow, sleeves angled downward for arms resting at sides, no sleeve-interior ellipses. Front neckline must have ONE shallow U-shaped transparent neck cutout at top, no rear collar rim. IMPORTANT: fill any deep V slit below that shallow U with matching opaque fabric, so no empty hole reaches the chest. Short fitted hip hem, realistic drape. Center garment large within square transparent PNG. Genuine alpha zero outside and in shallow U neck cutout. No mannequin, hanger, face, hands, text, background, checkerboard, or shadow outside garment.

The Legendary output then received this cleanup prompt:

> Precise asset cleanup. Keep this tunic illustration exactly unchanged. Remove the entire checkerboard background, including inside the U-shaped neckline. Deliver a transparent-background PNG with real alpha transparency, not a painted checkerboard. Only the garment remains. Preserve all garment fabric as opaque and the silhouette exactly. This is a game equipment cutout asset.

Three legacy tunics, each using its original tunic and body:

> Precise wearable sprite edit: preserve this tunic's colors and painterly fantasy design, with cream long sleeves, but fit it to the Keeper body reference. Output ONLY the tunic on a REAL transparent alpha background. No body or skin. Narrow fitted shoulders, sleeves hanging downward to the wrists of the arms resting beside the body. Shallow front U neckline, no rear collar edge and no dark hollow hole: any deep V below the neck must contain opaque cream undershirt fabric. Short hem at hips, no floating sleeve tube interiors. Center the garment large in a square transparent image. Maintain original green/blue/purple tunic design from first reference.

Rejected opaque/checkerboard generations were not added to the project. Originals remain intact. The static preview now includes all five complete sets, three legacy tunics, a mixed outfit, shirt-only, legwear-only and the base character.

### Rare sleeve-front correction

The Rare tunic's v2 sprite still contained two dark rear-sleeve crescents. The corrected worn asset is `assets/avatar/clothing_rare_torso_worn_v3.png`; the v1 inventory identity and other outfits are unchanged. The other four short-sleeve sprites were inspected and do not contain the same hollow sleeve openings.

Built-in image editor prompt:

> Use case: precise-object-edit. Edit target: this exact blue game tunic cutout. Change ONLY the two sleeve openings: remove the dark blue/gray crescent-shaped REAR sleeve lining below each cream wave-pattern cuff. Those rear crescent pixels must become fully transparent. Keep the FRONT cream-and-blue wave cuff intact; each sleeve must end at that single front cuff edge, with NO oval opening, NO underside fabric, NO rear rim, NO hollow tube. Everything else must be identical: garment shape, shoulders, collar, belt, pouch, colors, embroidery, proportions and placement. Preserve image canvas size and the genuine alpha-transparent background. Do not add skin, arms, mannequin, background or checkerboard. This is the front clothing layer worn over a character's visible arms, not a hanging product photo.

Transparency cleanup prompt:

> Use case: background-extraction. Remove the entire gray checkerboard from this exact tunic image and produce a genuinely transparent alpha PNG cutout. Keep the tunic unchanged, particularly the single flat front edge on both wave-pattern sleeve cuffs: no sleeve interior, no rear fabric, no oval openings. The removed background must have alpha zero, including the neck opening and spaces between sleeves and waist. Transparent background, not black, white or checkerboard. Preserve canvas, colors, position, all garment details.

### Collar occlusion

All eight worn tunics now share a neck-occlusion mask in `fitKeeperLayer`. The mask hides rear collar fabric where the actual neck belongs while retaining the front trim. Each garment's fitted box becomes the SVG viewBox, keeping the neck opening anchored to the same body coordinates in Home, Mirror and header. Other slots clear this mask. This is a rendering correction; no artwork, inventory identities or save data changed.

Run `node --test tests/game.test.cjs tests/wardrobe.test.cjs tests/progression.test.cjs`.
Run `node scripts/preview-wardrobe.cjs` to regenerate static light/dark visual fixtures in tests/. These contain production-renderer markup and do not access browser saves. Visual checks cover all five outfit combinations, light/dark rarity tiles and the 320px Home, milestones, Mirror and Board layout.
