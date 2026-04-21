/**
 * Product catalog — single source of truth. Change a product = edit this
 * file + redeploy. Data sourced from Meesho_Top_Sellers_Report.xlsx,
 * rebranded for curated-lifestyle positioning.
 */

export const SHIPPING_PAISE = 4900; // ₹49 flat, non-refundable
export const COD_ADVANCE_PAISE = SHIPPING_PAISE; // POD upfront = shipping
export const SHIPPING_HSN_CODE = "9965"; // Goods Transport Agency services
export const SHIPPING_GST_RATE = 18;

export type Category =
  | "kitchen"
  | "beauty"
  | "electronics"
  | "fashion"
  | "footwear";

export type Product = {
  slug: string;
  title: string;
  category: Category;
  categoryLabel: string;
  status: "live" | "coming-soon";

  // All prices in paise. Shipping is a separate constant (SHIPPING_PAISE).
  mrpPaise: number; // struck-through anchor (item-only, excludes shipping)
  itemPricePaise: number; // what customer pays for the item (POD: in cash at delivery)
  itemPrepaidPricePaise: number; // itemPricePaise × 0.95 rounded to nearest ₹

  // When true, the headline price the customer sees (on cards, PDP, ads) is the
  // all-inclusive total — i.e. itemPricePaise + SHIPPING_PAISE. The checkout
  // summary still breaks it down as item + shipping, so GST + accounting stay
  // clean, but nothing is added on top at the till — the customer pays exactly
  // what the creatives advertised.
  shippingIncluded?: boolean;

  hsnCode: string;
  gstRatePercent: number;

  images: { src: string; alt: string; width: number; height: number }[];
  shortSubtitle: string;
  bullets: string[];
  description: string;
  specs: { label: string; value: string }[];
  startingInventory: number;

  // Optional PDP storytelling blocks — rendered as dedicated sections on the
  // product detail page when present. Keep them OPTIONAL so legacy products
  // without this content don't break.
  scenarios?: {
    title: string;
    body: string;
    imageSrc?: string;
    imageAlt?: string;
  }[];
  howItWorks?: {
    step: number;
    title: string;
    body: string;
  }[];

  // 40-word direct-answer summary, keyword-first. Renders as a bold-italic
  // lead above the Description H2 + becomes the first sentence of Product
  // schema description. Ideal opening pattern for AI citation.
  tldr?: string;

  // PDP FAQ block (5 Q&A recommended). Each answer 40–60 words, self-contained.
  // Renders below Specs + gets emitted as FAQPage JSON-LD — AI assistants
  // (ChatGPT, Perplexity, Bing Copilot) ingest this even though Google
  // deprecated the commercial rich result in Aug 2023.
  faqs?: { question: string; answer: string }[];
};

/** 5% off item, rounded to nearest rupee (customer-favourable rounding). */
function discount5(paise: number): number {
  return Math.round((paise * 0.95) / 100) * 100;
}

export const products: Product[] = [
  // === KITCHEN ===
  {
    slug: "oil-dispenser",
    title: "Duck Oil & Brush Bottle — 200ml",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "live",
    // ₹499 is the all-in advertised price (creatives promise "incl. shipping").
    // Internally: ₹450 item + ₹49 shipping = ₹499 total paid by customer.
    shippingIncluded: true,
    mrpPaise: 79900,
    itemPricePaise: 45000,
    itemPrepaidPricePaise: discount5(45000),
    hsnCode: "7013",
    gstRatePercent: 18,
    images: [
      { src: "/assets/products/oil-dispenser/thumbnail.webp", alt: "Duck-shaped silicone oil brush bottle with golden oil on warm cream backdrop", width: 1200, height: 1500 },
      { src: "/assets/products/oil-dispenser/pdp-01.webp", alt: "Duck oil & brush bottle — hero cover", width: 1200, height: 1200 },
      { src: "/assets/products/oil-dispenser/pdp-02.webp", alt: "Four reasons you'll love it — features at a glance", width: 1200, height: 1200 },
      { src: "/assets/products/oil-dispenser/pdp-03.webp", alt: "Dimensions and specs — 200ml, 17cm tall, 7cm diameter", width: 1200, height: 1200 },
      { src: "/assets/products/oil-dispenser/pdp-04.webp", alt: "One bottle, many uses — BBQ, salads, everyday cooking, baking", width: 1200, height: 1200 },
      { src: "/assets/products/oil-dispenser/pdp-05.webp", alt: "How it works — three steps, zero mess", width: 1200, height: 1200 },
      { src: "/assets/products/oil-dispenser/pdp-06.webp", alt: "Why the duck bottle — comparison and ₹499 price", width: 1200, height: 1200 },
    ],
    shortSubtitle: "200ml · glass jar + silicone brush",
    bullets: [
      "Silicone brush lives inside the jar — no extra tool",
      "Clear glass body so you always see the oil level",
      "Dishwasher-safe, food-grade silicone duck brush",
      "Built-in portion control — less pouring, even coat",
    ],
    description:
      "Every kitchen has the same small problem: the oil bottle is in one place, the pastry brush is in another, and by the time you've found both you've already dripped on the counter. This little jar just solves it — a food-grade silicone brush lives inside the glass, always coated, always ready.\n\nLift the lid and the brush comes out already glazed with oil. Run it across a roti, a paratha, a tray of skewers, a cake tin, a hot pan — even coat, no drips, nothing extra to wash up. The clear borosilicate glass lets you see how much oil is left at a glance, and because the brush does the pouring for you, you end up using measurably less oil per meal without thinking about it.\n\n200ml capacity, 17cm tall, weighs almost nothing on the shelf. The silicone duck head pops out for the dishwasher; the glass rinses under warm water in seconds. Heat-safe and non-reactive — so it's equally happy with everyday refined oil, your good olive oil, desi ghee, or mustard oil pulled out for the weekend fish fry.\n\nComes in two colourways — a warm mustard yellow or a soft off-white — both with the signature duck-shaped brush. Fair warning: it becomes the most-photographed thing on the counter within a week.\n\nSmall jar. Big kitchen energy. The kind of quiet upgrade you don't notice you needed until the day you already have it.",
    specs: [
      { label: "Capacity", value: "200 ml" },
      { label: "Material", value: "Borosilicate glass + food-grade silicone" },
      { label: "Dimensions", value: "H 17 cm × D 7 cm" },
      { label: "Weight", value: "180 g" },
      { label: "Colours", value: "Yellow or white (pick at checkout)" },
      { label: "Care", value: "Brush is dishwasher-safe; rinse glass by hand" },
    ],
    startingInventory: 50,
    scenarios: [
      {
        title: "Sunday paratha stack",
        body: "Glaze between layers so they stay soft all morning — no ghee bowl, no wooden spoon to wash.",
        imageSrc: "/assets/products/oil-dispenser/scenario-01.webp",
        imageAlt: "Yellow duck oil brush glazing a paratha on a warm wooden counter",
      },
      {
        title: "Grill night",
        body: "Lacquer paneer tikka or vegetable skewers right before they hit the flame — even coat, no dunking.",
        imageSrc: "/assets/products/oil-dispenser/scenario-02.webp",
        imageAlt: "Yellow duck oil brush lacquering paneer tikka skewers on a grill pan",
      },
      {
        title: "Salad finish",
        body: "A final whisper of olive oil over the leaves — dressing without drowning.",
        imageSrc: "/assets/products/oil-dispenser/scenario-03.webp",
        imageAlt: "White duck oil brush finishing a glass bowl of fresh salad with olive oil",
      },
      {
        title: "Cake tins & trays",
        body: "Grease evenly in seconds — no wasteful pour, no paper towel, no sticky fingertip.",
        imageSrc: "/assets/products/oil-dispenser/scenario-04.webp",
        imageAlt: "Yellow duck oil brush greasing a round cake tin evenly",
      },
    ],
    howItWorks: [
      { step: 1, title: "Fill with oil", body: "Unscrew the lid, pour up to 200 ml through the wide mouth." },
      { step: 2, title: "Lift the duck brush", body: "The silicone brush is always coated — no dipping, no second tool." },
      { step: 3, title: "Brush & cook", body: "Even coat on roti, paratha, skewers, pans — no drips, no dirty brush holder." },
    ],
  },
  {
    slug: "manual-choppers",
    title: "Hand-Pull Vegetable Chopper",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 12600,
    itemPrepaidPricePaise: discount5(12600),
    hsnCode: "8205",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "Plastic-free, string-pull design",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "graters-slicers",
    title: "Modern Graters & Slicers Set",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 19900,
    itemPricePaise: 10000,
    itemPrepaidPricePaise: discount5(10000),
    hsnCode: "8205",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "chopping-board",
    title: "Beechwood Chopping Board",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 11100,
    itemPrepaidPricePaise: discount5(11100),
    hsnCode: "4419",
    gstRatePercent: 12,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "ice-cube-moulds",
    title: "Silicone Ice Cube Moulds (Set of 2)",
    category: "kitchen",
    categoryLabel: "Kitchen",
    status: "coming-soon",
    mrpPaise: 19900,
    itemPricePaise: 9400,
    itemPrepaidPricePaise: discount5(9400),
    hsnCode: "3924",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },

  // === BEAUTY & PERSONAL CARE ===
  {
    slug: "ghar-magic-soap",
    title: "Ghar Soaps — Handcrafted Bath Soap",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 59900,
    itemPricePaise: 39700,
    itemPrepaidPricePaise: discount5(39700),
    hsnCode: "3401",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "rice-face-wash",
    title: "Mamaearth Rice Face Wash (2-pack)",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 23500,
    itemPrepaidPricePaise: discount5(23500),
    hsnCode: "3304",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "keratin-hair-mask",
    title: "Nourishing Keratin Hair Mask",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 12000,
    itemPrepaidPricePaise: discount5(12000),
    hsnCode: "3305",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "body-cream",
    title: "Everyday Moisturising Body Cream",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 14900,
    itemPricePaise: 8500,
    itemPrepaidPricePaise: discount5(8500),
    hsnCode: "3304",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "sunscreen-spf50",
    title: "Daily Sunscreen SPF 50",
    category: "beauty",
    categoryLabel: "Beauty & Personal Care",
    status: "coming-soon",
    mrpPaise: 22900,
    itemPricePaise: 12100,
    itemPrepaidPricePaise: discount5(12100),
    hsnCode: "3304",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },

  // === CONSUMER ELECTRONICS ===
  {
    slug: "mobile-holder",
    title: "Adjustable Desk Mobile Holder",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 11500,
    itemPrepaidPricePaise: discount5(11500),
    hsnCode: "8517",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "mobile-charger",
    title: "Fast-Charge Mobile Charger",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 15900,
    itemPrepaidPricePaise: discount5(15900),
    hsnCode: "8504",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "selfie-stick",
    title: "Fancy Selfie Stick",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 20600,
    itemPrepaidPricePaise: discount5(20600),
    hsnCode: "9006",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "key-holder",
    title: "Magnetic Key Holder",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 19900,
    itemPricePaise: 10200,
    itemPrepaidPricePaise: discount5(10200),
    hsnCode: "8301",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "portronics-cable",
    title: "Portronics Konnect Fast Cable",
    category: "electronics",
    categoryLabel: "Consumer Electronics",
    status: "coming-soon",
    mrpPaise: 24900,
    itemPricePaise: 11200,
    itemPrepaidPricePaise: discount5(11200),
    hsnCode: "8544",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },

  // === FASHION — WOMEN KURTIS ===
  {
    slug: "rayon-myra-kurti",
    title: "Rayon Myra Petite Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 49900,
    itemPricePaise: 24400,
    itemPrepaidPricePaise: discount5(24400),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "net-charvi-kurti",
    title: "Net Charvi Superior Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 20000,
    itemPrepaidPricePaise: discount5(20000),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "rayon-banita-kurti",
    title: "Rayon Banita Alluring Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 19600,
    itemPrepaidPricePaise: discount5(19600),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "myra-drishya-kurti",
    title: "Myra Drishya Festive Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 89900,
    itemPricePaise: 44300,
    itemPrepaidPricePaise: discount5(44300),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "aagyeyi-kurti",
    title: "Aagyeyi Casual Kurti",
    category: "fashion",
    categoryLabel: "Fashion — Kurtis",
    status: "coming-soon",
    mrpPaise: 39900,
    itemPricePaise: 18100,
    itemPrepaidPricePaise: discount5(18100),
    hsnCode: "6109",
    gstRatePercent: 5,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },

  // === WOMEN FOOTWEAR ===
  {
    slug: "relaxed-slippers",
    title: "Relaxed Everyday Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 34900,
    itemPricePaise: 17300,
    itemPrepaidPricePaise: discount5(17300),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "fashion-slippers-1",
    title: "Unique Fashionable Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 12800,
    itemPrepaidPricePaise: discount5(12800),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "fashion-slippers-2",
    title: "Latest Fashionable Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 13700,
    itemPrepaidPricePaise: discount5(13700),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "birde-casual-shoes",
    title: "Birde Casual Shoes",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 79900,
    itemPricePaise: 35900,
    itemPrepaidPricePaise: discount5(35900),
    hsnCode: "6404",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
  {
    slug: "attractive-slippers",
    title: "Unique Attractive Slippers",
    category: "footwear",
    categoryLabel: "Women Footwear",
    status: "coming-soon",
    mrpPaise: 29900,
    itemPricePaise: 12800,
    itemPrepaidPricePaise: discount5(12800),
    hsnCode: "6402",
    gstRatePercent: 18,
    images: [],
    shortSubtitle: "",
    bullets: [],
    description: "",
    specs: [],
    startingInventory: 0,
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function productsByCategory(): Record<Category, Product[]> {
  const grouped: Record<Category, Product[]> = {
    kitchen: [],
    beauty: [],
    electronics: [],
    fashion: [],
    footwear: [],
  };
  for (const p of products) grouped[p.category].push(p);
  return grouped;
}
