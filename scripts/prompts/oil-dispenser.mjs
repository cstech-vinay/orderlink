/**
 * Nano Banana prompt set for the Oil Dispenser product (slug: oil-dispenser).
 * Duck-shaped silicone oil brush bottle — yellow + white variants.
 *
 * Prompts are derived from the OrderLink brand style system in
 * ~/.claude/.../memory/orderlink-*-style.md files.
 *
 * Order matters: thumbnail first (sets tonal anchor for the chat session),
 * then PDP slides, then feed, then stories. All flow through ONE Gemini
 * chat so later images stay visually consistent with earlier ones.
 */

export const productName = "Oil Dispenser — Duck Oil & Brush Bottle";
export const slug = "oil-dispenser";

export const sharedPreamble = `
You are generating product imagery for orderlink.in, an Indian D2C lifestyle shop. I am attaching real product reference images — use them as a PRODUCT REFERENCE ONLY. Copy the product's exact shape (duck-shaped silicone brush inside a small clear glass jar), colors (yellow variant and white variant), materials (silicone duck + clear glass + golden oil), and proportions — but COMPLETELY DISCARD the reference images' original backgrounds, counters, windows, and studio lighting. Re-light and re-stage the product fresh in each scene I describe.

Brand system (MANDATORY on every output):
- Fonts: Fraunces (serif display, italic for emphasis, variable SOFT axis), Instrument Sans (body), JetBrains Mono (uppercase labels / tracking-widest).
- Colors: Cream #FBF7F1 (primary bg), Cream Deep #F4EEE3 (secondary panel), Ink #1E1C1C (text), Ink Soft #5A5350 (secondary text), Coral #EC4356 (primary accent — italic-emphasis words, underline bars, price, CTAs), Orange #FF6E3A, Amber #FFBB56.
- Signature: subtle film-grain noise overlay at ~32% opacity (multiply blend) — organic, filmic, never flat-digital.
- Style rules: NO drop shadows on cards (flat aesthetic), rounded-lg cards, rounded-full pill badges, every italic Fraunces word has a thin coral underline bar directly under it.
- Premium, editorial, Kinfolk / Cereal magazine grade. Never generic e-com. Never marketplace-flat.

When I send the next prompt, use everything you already produced in this conversation as visual context so the entire set stays consistent.
`.trim();

/**
 * @typedef {Object} PromptSpec
 * @property {string} id            - Unique id used for filenames
 * @property {'thumbnail'|'pdp'|'feed'|'story'} kind
 * @property {string} aspectRatio   - Gemini config hint ('1:1', '4:5', '9:16')
 * @property {number} outWidth      - Target web-optimized output width
 * @property {number} outHeight     - Target web-optimized output height
 * @property {string} alt           - Alt text for website accessibility
 * @property {string} prompt        - Full Nano Banana prompt
 */

/** @type {PromptSpec[]} */
export const prompts = [
  // ========== 1 × THUMBNAIL (4:5) ==========
  {
    id: "thumbnail",
    kind: "thumbnail",
    aspectRatio: "4:5",
    outWidth: 1200,
    outHeight: 1500,
    alt: "Duck-shaped silicone oil brush bottle with golden oil on warm cream backdrop",
    prompt: `Vertical 4:5 portrait product thumbnail for orderlink.in, rendered edge-to-edge with no outer frame or border.

Background: warm Cream Deep #F4EEE3 seamless backdrop — a soft paper-textured surface transitioning into a gentle back-wall, with a barely-perceptible vignette toward the corners.

Product: the yellow-variant duck-shaped silicone oil brush bottle (hero variant only — do NOT include the white variant in this thumbnail), golden olive oil visible inside the clear glass jar. Position the bottle slightly below vertical center (lower rule-of-thirds intersection), occupying about 60-65% of the frame height. Keep the entire product silhouette inside a ~5% safe margin on all sides.

Lighting: warm morning window light from the upper-right, soft directional key, gentle fill from the left. A natural soft contact shadow grounds the bottle to the surface.

Styling context (minimal): a single sprig of fresh basil or curry leaves resting softly beside the jar, and optionally a small muted Coral #EC4356 matte ceramic pinch bowl peeking in from the lower-left edge (terracotta-tinted, not neon). Never busy.

Depth: shallow DOF, bottle razor sharp, supporting props softly defocused.

Finish: editorial Kinfolk / Cereal magazine color grade, warm and quiet. Subtle organic film-grain noise overlay at ~32% opacity. Flat aesthetic, no plastic look, no harsh highlights. STRICT: no text, no logos, no price tags, no ORDERLINK.IN branding, no category labels, no watermarks. Keep the upper-right quadrant especially clean.`,
  },

  // ========== 6 × PDP SLIDES (1:1) ==========
  {
    id: "pdp-01",
    kind: "pdp",
    aspectRatio: "1:1",
    outWidth: 1200,
    outHeight: 1200,
    alt: "Oil dispenser hero cover slide with headline: The duck oil & brush bottle",
    prompt: `Square 1:1 editorial product image for a product-page gallery. Full canvas: warm cream background #FBF7F1 with soft film-grain noise overlay at ~32% opacity across the entire image.

Product: both yellow and white variants of the duck-shaped silicone oil brush bottle side by side, golden oil visible in clear glass jars. Staged on a soft Cream Deep #F4EEE3 rounded-lg inset card, lit with warm directional key light from upper-left and subtle contact shadows. No leftover listing background.

Overlays:
- Top-left: JetBrains Mono uppercase tracking-widest eyebrow "NEW ARRIVAL" in Coral #EC4356, thin coral underline bar beneath.
- Large Fraunces display headline in Ink #1E1C1C across 3 lines: "The *duck*" / "oil &" / "brush bottle." — the word "duck" in Fraunces italic SOFT axis, colored Coral, with thin coral underline bar (0.09em) directly under it.
- Tiny Instrument Sans catalog code "s-496130467" at the bottom-left of the product inset card, Ink Soft.
- Three rounded-full pill tags centered row below product: Amber #FFBB56 Ink-text "200 ML", Ink-fill cream-text "GLASS + SILICONE", Ink-fill cream-text "2 COLOURS" — JetBrains Mono uppercase tracking-widest.
- Bottom-right: JetBrains Mono wordmark "ORDERLINK.IN" in Ink, Instrument Sans italic sub-line "shipping across india" in Ink Soft under it.
- Top-right: two tiny pagination dots (first filled coral, second hollow Ink Soft outline).

Magazine-grade editorial feel. No slide labels, no page-number pills, no outer frame.`,
  },
  {
    id: "pdp-02",
    kind: "pdp",
    aspectRatio: "1:1",
    outWidth: 1200,
    outHeight: 1200,
    alt: "Four reasons you'll love it — product features at a glance",
    prompt: `Square 1:1 product image. Full canvas: cream #FBF7F1 background with soft film-grain overlay at ~32% opacity. No outer frame.

Top ~45%: a freshly-lit editorial photo of the duck-shaped silicone oil brush bottle (both yellow and white variants side by side) against a soft Cream Deep #F4EEE3 gradient wall with warm window-style directional light and subtle natural shadow.

Lower ~55%:
- JetBrains Mono uppercase tracking-widest eyebrow "BUILT FOR THE BUSY KITCHEN" in Coral #EC4356 with thin coral underline.
- Big Fraunces headline in Ink: "Four reasons you'll *love* it." — "love" in Fraunces italic Coral with thin coral underline.
- Four horizontal feature rows separated by thin Ink Soft hairline dividers. Each row: small rounded-full Amber #FFBB56 circular icon badge left with minimalist Ink line icon, then Instrument Sans bold Ink feature title, em-dash, then 1-line Instrument Sans Ink Soft description.

Row 1 (down-arrow-into-jar icon): "Brush & bottle in one — Silicone brush lives inside the jar. No extra tool."
Row 2 (glass-jar icon): "Transparent glass body — Always see how much oil is left. Heat-safe borosilicate."
Row 3 (circular-arrow icon): "Dishwasher-safe — Food-grade silicone. No residue, no smell."
Row 4 (check-circle icon): "Portion control built-in — Brush means less pouring. Less oil per meal."

Flat aesthetic, no shadows on the rows. No slide labels, no page-number pills.`,
  },
  {
    id: "pdp-03",
    kind: "pdp",
    aspectRatio: "1:1",
    outWidth: 1200,
    outHeight: 1200,
    alt: "Dimensions and specs: 200ml capacity, 17cm height, 7cm diameter",
    prompt: `Square 1:1 product image. Full canvas: Cream Deep #F4EEE3 with paper texture + soft film-grain overlay at ~32% opacity. Edge-to-edge, no outer frame.

Top-left:
- JetBrains Mono uppercase tracking-widest eyebrow "SIZE & SPECS" in Coral #EC4356 with thin coral underline.
- Big Fraunces headline in Ink on two lines: "Fits the *hand*. / Fits the *shelf*." — "hand" and "shelf" in Fraunces italic Coral, each with thin coral underline.

Center: the white-variant duck-shaped silicone oil brush bottle on a rounded-lg cream #FBF7F1 inset card, clean technical product lighting, crisp grounding shadow. Three rounded-full Amber #FFBB56 Ink-text JetBrains Mono pill callouts float around the product, connected by thin dashed coral lines — "200 ml" upper-left pointing to jar, "17 cm" right pointing to full height, "7 cm Ø" below pointing to diameter.

Bottom: three columns separated by thin Ink Soft vertical dividers. JetBrains Mono uppercase label above Fraunces value in Ink.
- "CAPACITY" / "200 ml"
- "MATERIAL" / "Glass + Silicone"
- "WEIGHT" / "180 g"

Spec-sheet editorial feel. Film-grain visible. No slide labels, no page-number pills.`,
  },
  {
    id: "pdp-04",
    kind: "pdp",
    aspectRatio: "1:1",
    outWidth: 1200,
    outHeight: 1200,
    alt: "One bottle, many uses: BBQ, salads, everyday cooking, baking",
    prompt: `Square 1:1 product image. Full canvas: cream #FBF7F1 with film-grain overlay at ~32% opacity.

Top-center:
- JetBrains Mono uppercase tracking-widest eyebrow "ONE BOTTLE · MANY USES" in Coral #EC4356 with thin coral underline.
- Big centered Fraunces headline in Ink: "Works for *everything* you cook." — "everything" in Fraunces italic Coral with thin coral underline.

Below: 2×2 grid of four rounded-lg square lifestyle photos (tight gutters, flat, no shadows). The duck-shaped silicone oil brush bottle appears in every tile with realistic integration and scene-matched lighting. Each tile has a rounded-full Ink #1E1C1C circular number badge top-right (cream number 1/2/3/4 in JetBrains Mono) and a rounded-full cream-fill capsule label bottom-left in JetBrains Mono uppercase tracking-widest Ink text.

Tile 1: a hand using the yellow duck brush to glaze colorful vegetable kebabs on a dark grill pan, warm amber evening light, visible steam. Label: "BBQ & GRILL".
Tile 2: a young Indian woman in a white tee and grey checked bandana tossing a glass salad bowl in a bright modern kitchen, the white duck bottle clearly visible on the marble counter beside her, natural window light. Label: "SALADS & DRESSINGS".
Tile 3: a hand lifting the yellow duck brush out of its jar, warm wooden counter with tomatoes, garlic and herbs softly out of focus, morning window light. Label: "EVERYDAY COOKING".
Tile 4: overhead view of the yellow duck bottle beside a baking tray of golden muffins being brushed with oil, parchment paper, soft diffused daylight. Label: "BAKING & PAN PREP".

Editorial, premium, flat-with-grain feel. No slide labels, no page-number pills.`,
  },
  {
    id: "pdp-05",
    kind: "pdp",
    aspectRatio: "1:1",
    outWidth: 1200,
    outHeight: 1200,
    alt: "How it works: three steps — fill, lift, brush",
    prompt: `Square 1:1 product image. Full canvas: Cream Deep #F4EEE3 with paper texture + film-grain overlay at ~32% opacity.

Top-left:
- JetBrains Mono uppercase tracking-widest eyebrow "HOW IT WORKS" in Coral #EC4356 with thin coral underline.
- Big Fraunces headline in Ink on two lines: "Three *steps*. / Zero mess." — "steps" in italic Coral with thin coral underline.

Center: three rounded-lg cream #FBF7F1 step cards stacked vertically (flat, no shadows, crisp edges). Each card: rounded-full Ink circular number badge on the left (cream number 1/2/3 in JetBrains Mono), minimalist Coral line icon, Instrument Sans bold Ink step title, 1-line Instrument Sans Ink Soft description.

Card 1 (oil-pouring-into-jar icon): "Fill with oil" — "Unscrew the lid, pour up to 200 ml through the wide mouth."
Card 2 (brush-lifting icon): "Lift the duck brush" — "Silicone brush is always coated — no dipping, no second tool."
Card 3 (brush-stroke icon): "Brush & cook" — "Even coat on roti, paratha, skewers, pans — no drips."

Thin coral down-arrows between cards. Below: a Coral asterism divider "⁂" centered, then a JetBrains Mono uppercase tracking-widest caps strip in Ink: "ONE BOTTLE · ZERO WASTE (in Coral) · EVERY MEAL".

Icons are minimalist coral line illustrations, NOT photo cutouts. Film-grain throughout. No slide labels, no page-number pills.`,
  },
  {
    id: "pdp-06",
    kind: "pdp",
    aspectRatio: "1:1",
    outWidth: 1200,
    outHeight: 1200,
    alt: "Why the duck bottle — comparison table and ₹499 price",
    prompt: `Square 1:1 product image. Full canvas: deep Ink #1E1C1C background with subtle film-grain noise overlay at ~32% opacity (warm organic texture over dark).

Top-left:
- JetBrains Mono uppercase tracking-widest eyebrow "WHY THE DUCK BOTTLE" in Coral #EC4356 with thin coral underline.
- Big cream-white (#FBF7F1) Fraunces headline on two lines: "One smart jar beats / a *drawer full* of tools." — "drawer full" in Fraunces italic Coral with thin coral underline bar under it.

Center: compact comparison table, flat (no shadows), three columns. Header row dark grey (#2A2727) with JetBrains Mono uppercase tracking-widest text: "FEATURE | DUCK BOTTLE | REGULAR BOTTLE". Six data rows with thin Ink Soft dividers. Left column Instrument Sans cream. Middle column Coral ✓ for every row. Right column Ink Soft ✗ for rows 1-4 and row 6, Coral ✓ for row 5.
Rows: "Built-in brush", "See oil level", "Even coating", "No drips / clean counter", "Dishwasher safe", "Looks cute on the counter".

Bottom-left: huge Fraunces italic price "₹499" in Coral #EC4356, small JetBrains Mono uppercase cream sub-line "INCL. SHIPPING · ALL INDIA" in Ink Soft beneath.
Bottom-right: JetBrains Mono uppercase wordmark "ORDERLINK.IN" in Coral, small Instrument Sans italic cream sub-line "7-day easy returns" under it.

Small coral asterism "⁂" centered between the table and price row. Dark, luxe, editorial-D2C feel. Film-grain visible. No slide labels, no page-number pills.`,
  },

  // ========== 3 × FEED POSTS (1:1) ==========
  {
    id: "feed-01",
    kind: "feed",
    aspectRatio: "1:1",
    outWidth: 1080,
    outHeight: 1080,
    alt: "Gen Z relatable feed post — not me reorganizing my entire kitchen",
    prompt: `Square 1:1 lifestyle product photo for an Indian D2C Instagram feed post. Place the duck oil brush bottle (yellow variant) on a warm wooden kitchen counter with soft morning sunlight, out-of-focus cherry tomatoes, cutting board, and garlic cloves in background. Cozy Pinterest home-cook aesthetic, film-grain overlay at ~32% opacity.

Overlay an iPhone Notes-app style white rounded rectangle near the top-left reading: "not me reorganizing my entire kitchen just so this little duck guy can be on display 🐤🧄" in iOS system font, with "duck guy" highlighted in a Coral #EC4356 marker swipe. Add a small Fraunces italic script in Coral near the bottle that says "he lives here now" with a thin curved coral arrow pointing to the duck.

Top-left: rounded-full Ink pill "@ORDERLINK.IN" in cream JetBrains Mono uppercase. Bottom-right: rounded-full Coral #EC4356 pill "₹499 · FREE SHIP" in JetBrains Mono cream uppercase.

Warm golden-hour grading, 50mm shallow DOF, no watermark, high-res.`,
  },
  {
    id: "feed-02",
    kind: "feed",
    aspectRatio: "1:1",
    outWidth: 1080,
    outHeight: 1080,
    alt: "Amazon-style review card testimonial floating over kitchen scene",
    prompt: `Square 1:1 social ad mimicking a marketplace product review card over a blurred pastel kitchen scene. Background: blurred Cream Deep counter with the duck oil brush bottle (yellow variant) just visible at the top edge, warm creamy light, film-grain overlay at ~32% opacity.

Foreground center: clean cream #FBF7F1 rounded-lg review card (flat, no shadow). Circular Coral avatar with white letter "P" inside, name "Priya M." in Instrument Sans bold Ink, green "✓ Verified Purchase" text, five Amber #FFBB56 stars, bold Fraunces headline "Honestly the cutest thing on my counter rn", Instrument Sans grey metadata "Reviewed in India on 18 April 2026", then Instrument Sans body: "Bought 2 — one for oil, one for ghee. My husband keeps calling it 'the duck.' No drips, brush is inside so no mess, glass bottom so you can see what's left. 10/10 for ₹499." Below: rounded-full light pill "👍 Helpful (247)" and "Report" link.

Top-left of composition: rounded-full Ink pill "@ORDERLINK.IN" in cream JetBrains Mono uppercase. Photorealistic, trustworthy e-commerce mood.`,
  },
  {
    id: "feed-03",
    kind: "feed",
    aspectRatio: "1:1",
    outWidth: 1080,
    outHeight: 1080,
    alt: "Editorial aesthetic — Sunday kitchen with the duck bottle",
    prompt: `Square 1:1 editorial lifestyle campaign photo, Kinfolk / Cereal magazine aesthetic. A young Indian woman in a plain white tee and grey checked bandana stands at a marble kitchen island tossing a glass bowl of fresh salad, soft natural window light from the right, warm cream palette. On the counter beside her, clearly visible but not centered: the yellow-variant duck-shaped oil brush bottle (keep identical to reference — only shape/material/color, not background). Hero product sharp, human slightly soft — cinematic 85mm look. Film-grain overlay at ~32% opacity.

Top-right overlay: slightly tilted cream #FBF7F1 paper price-tag card with string, reading Fraunces italic "₹499" in Coral and JetBrains Mono "INCL. SHIPPING" small caps below in Ink Soft.

Lower-left overlay: Fraunces italic pull-quote in Ink: "the tiny upgrade that makes every meal feel a little more *luxe*." — "luxe" in Coral with thin coral underline. Under it, Instrument Sans italic small caption in Ink Soft: "— Sunday kitchen, 7 am".

Tiny Instrument Sans catalog code "s-496130467" bottom-left in Ink Soft. Top-left: rounded-full Ink pill "@ORDERLINK.IN" in cream JetBrains Mono. Muted cream grading, magazine polish.`,
  },

  // ========== 3 × STORIES / REELS (9:16) ==========
  {
    id: "story-01",
    kind: "story",
    aspectRatio: "9:16",
    outWidth: 1080,
    outHeight: 1920,
    alt: "POV IG story — you finally bought the viral duck oil bottle",
    prompt: `Vertical 9:16 Instagram Story, POV-style UGC photo. A young Indian woman in a white tee and grey checked bandana stands in a bright kitchen holding a glass salad bowl, smiling softly downward, shot from slightly below like a selfie-handoff — authentic phone-camera feel with light grain. On the counter in front of her, clearly visible: the yellow-variant duck oil brush bottle (identical to reference, backdrop discarded). Film-grain overlay at ~32% opacity.

Top-left: rounded-full Ink pill "@ORDERLINK.IN" in cream JetBrains Mono uppercase. Upper-center: big cream Fraunces headline over two lines: "you finally bought the" / "viral *duck* oil bottle." — "duck" in Fraunces italic Coral #EC4356 with thin coral underline bar under it.

Mid-right: slightly tilted cream sticker bubble with Fraunces italic Coral text "worth every ₹499".

Near the bottom: an Instagram-style poll sticker reading "which one are you getting?" in Instrument Sans Ink, with two rounded-full buttons — left Amber #FFBB56 Ink-text "🟡 yellow", right Cream Deep pale Ink-text "⚪ white".

Very bottom strip: JetBrains Mono uppercase tracking-widest Ink Soft "TAP TO SHOP · ORDERLINK.IN".

Scroll-stopping, native-to-Stories feel.`,
  },
  {
    id: "story-02",
    kind: "story",
    aspectRatio: "9:16",
    outWidth: 1080,
    outHeight: 1920,
    alt: "Editorial minimal story — new arrival, small jar big kitchen energy",
    prompt: `Vertical 9:16 Instagram Story, minimalist editorial composition on Cream Deep #F4EEE3 paper-texture background with film-grain overlay at ~32% opacity.

Centered upper half: a clean studio photo of TWO duck oil brush bottles side by side (yellow variant + white variant) from the reference, clear glass jars with golden oil. Soft diffused studio light, subtle shadow, tiny faded Instrument Sans catalog code "s-496130467" under the product in Ink Soft.

Lower half: large Fraunces headline in Ink, left-aligned, two lines: "small *jar*. / big kitchen *energy*." — "jar" and "energy" in Fraunces italic Coral #EC4356, each with thin coral underline bar under it.

Directly under headline: Instrument Sans italic caption "— new arrival · orderlink.in" in Ink Soft.

Top-left: rounded-full cream #FBF7F1 pill "ORDERLINK.IN" in Ink JetBrains Mono uppercase. Top-right: rounded-full Ink pill with tiny Amber dot, "₹499 · FREE SHIP" in cream JetBrains Mono.

Calm, premium, Aesop/Muji vibe. High resolution.`,
  },
  {
    id: "story-03",
    kind: "story",
    aspectRatio: "9:16",
    outWidth: 1080,
    outHeight: 1920,
    alt: "Story sale — the duck brush bottle everyone's obsessed with",
    prompt: `Vertical 9:16 Instagram Story, high-contrast conversion creative. Background: moody close-up of a hand using the yellow duck-shaped silicone brush to glaze a skewer of colorful vegetable kebabs (bell peppers, onion, paneer) on a dark pan, warm amber light, steam wisps, cinematic food-photography feel. Film-grain overlay at ~32% opacity.

Upper-left: rounded-full Ink pill "@ORDERLINK.IN" in cream JetBrains Mono uppercase. Below it, large cream Fraunces headline over 3 lines: "the duck" / "brush bottle" / "everyone's *obsessed* with." — "obsessed" in Fraunces italic Coral #EC4356 with thin coral underline bar.

Upper-right: a Coral #EC4356 tilted starburst badge reading JetBrains Mono cream "ONLY ₹499" one line, "FREE SHIPPING" small caps below.

Near bottom: wide rounded-full cream #FBF7F1 CTA button with JetBrains Mono uppercase "TAP THE LINK" small Ink Soft above, large Instrument Sans bold "SHOP IT NOW →" in Ink below.

Very bottom: thin JetBrains Mono uppercase cream "SWIPE UP TO ORDER ↑".

Punchy, urgent, ad-native.`,
  },

  // ========== 4 × PDP IN-CONTEXT SCENARIO PHOTOS (1:1) ==========
  // Used by the "In your kitchen" strip on the product detail page. Plain
  // lifestyle product photos — NO text overlays, NO branding, NO price tags.
  {
    id: "scenario-01",
    kind: "scenario",
    aspectRatio: "1:1",
    outWidth: 800,
    outHeight: 800,
    alt: "Yellow duck oil brush glazing a paratha on a warm wooden counter",
    prompt: `Square 1:1 editorial lifestyle photograph. A hand lifting the yellow-variant duck-shaped silicone oil brush and lightly glazing a freshly-cooked paratha resting on a warm wooden board, with two more parathas stacked softly behind it. Morning Indian kitchen light from the left, warm sand-cream tones, shallow DOF with the brush and the glazed paratha sharp and the back stack softly defocused. The yellow duck bottle (glass jar with golden oil visible) sits just in view at the right edge of the frame.

Subtle film-grain noise overlay at ~32% opacity across the image. Kinfolk-magazine color grade, warm and quiet. No text, no logos, no branding, no watermarks, no price tags. Pure lifestyle moment.`,
  },
  {
    id: "scenario-02",
    kind: "scenario",
    aspectRatio: "1:1",
    outWidth: 800,
    outHeight: 800,
    alt: "Yellow duck oil brush lacquering paneer tikka skewers on a grill pan",
    prompt: `Square 1:1 editorial lifestyle photograph. A hand holding the yellow-variant duck-shaped silicone oil brush, lacquering a skewer of paneer tikka and colorful bell peppers on a dark cast-iron grill pan, warm amber evening light, a thin wisp of steam rising from the pan. The yellow duck bottle sits just at the left edge of the frame, glass jar with golden oil clearly visible.

Cinematic food photography feel, shallow DOF, rich warm tones — mustard yellow, charred green, paneer cream. Subtle film-grain overlay at ~32% opacity. Kinfolk-magazine polish. No text, no logos, no price tags, no branding.`,
  },
  {
    id: "scenario-03",
    kind: "scenario",
    aspectRatio: "1:1",
    outWidth: 800,
    outHeight: 800,
    alt: "White duck oil brush finishing a glass bowl of fresh salad with olive oil",
    prompt: `Square 1:1 editorial lifestyle photograph. A hand using the white-variant duck-shaped silicone oil brush to lightly finish a large glass bowl of fresh green salad (rocket leaves, cucumber ribbons, cherry tomatoes, a sprinkle of seeds) — the brush is just barely touching the leaves, suggesting the gentle final dress of olive oil. The white duck bottle sits on a marble counter beside the bowl, clear glass jar with golden olive oil inside.

Bright, airy kitchen light from a window, cool-warm balance, shallow DOF. Cream and green palette, minimalist and calm. Subtle film-grain overlay at ~32% opacity. Editorial magazine grade. No text, no logos, no branding, no watermarks, no price tags.`,
  },
  {
    id: "scenario-04",
    kind: "scenario",
    aspectRatio: "1:1",
    outWidth: 800,
    outHeight: 800,
    alt: "Yellow duck oil brush greasing a round cake tin evenly",
    prompt: `Square 1:1 editorial lifestyle photograph, overhead / top-down angle. A hand using the yellow-variant duck-shaped silicone oil brush to evenly grease the inside of a round metal cake tin resting on a soft linen cloth, a small bowl of flour and a wooden spoon softly out of focus nearby. The yellow duck bottle (glass jar, golden oil) sits at the upper edge of the frame.

Soft diffused daylight, warm cream and soft grey palette, shallow DOF. Baking-afternoon mood, quiet and precise. Subtle film-grain overlay at ~32% opacity. Editorial magazine polish. No text, no logos, no branding, no watermarks, no price tags.`,
  },
];
