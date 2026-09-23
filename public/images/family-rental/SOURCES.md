# Family rental scene

## Current illustration

`family-scene-v2.webp` replaces the CSS sprite composition with one static,
transparent scene. It was generated with the built-in image generation tool,
using `family-atlas.png` as the reference, then resized to 1440 x 720 and encoded
as WebP with Sharp (quality 95, alpha quality 100, smart chroma subsampling,
effort 6). The 267 KB asset preserves transparency and provides 3x pixel
density at the largest display size (480 CSS pixels on the welcome page).

Brief: preserve the family, moving boxes, plant, house and apartment building;
combine them into a single horizontal composition with readable faces and clean,
anti-aliased outlines. No text, keys, animation or background. The illustration
does not depict actual users or testimonials.

Original generated PNG (1774 x 887) is preserved at:
`C:/Users/Usuario/.codex/generated_images/019e318d-360c-73d2-9812-5ed8c208f5c5/exec-c4a3f633-4941-444a-817a-f900d1c4427a.png`.

## Previous sprite atlas

`family-atlas.png` is an original bitmap generated for Zentro Urbano with the
built-in image generation tool. It does not depict actual users or testimonials.
The original is preserved in the Codex generated_images directory.

Brief: six isolated transparent sprites in a 3-by-2 atlas: father with a moving
box, mother waving, child with a plant, rental house, apartment building and
moving boxes. Clean charcoal contours with teal, blue and gray accents. No
pixel art, gradients, text or logos. The CSS crops each sprite without changing
the source image. The source includes alpha transparency.
`family-atlas.webp` is a lossless re-encoding of the PNG for delivery (644 KB,
down from 1.7 MB), preserving resolution and transparency.

The previous scene was made static on every device, with no decorative key or
replay control. These original atlas files are retained as source references;
the live component now uses the single scene above.
