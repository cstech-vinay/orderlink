import type { CategoryId } from "./categories";

export type MerchantId = "amazon" | "myntra" | "nykaa";

export type Merchant = {
  id: MerchantId;
  label: string;
  price: number;
  eta: string;
  stock: "In stock" | "Few left" | "Out of stock";
  affiliateUrl: string;
};

export type Review = {
  name: string;
  rating: 1 | 2 | 3 | 4 | 5;
  date: string;
  title: string;
  body: string;
};

export type Reel = {
  src: string;
  poster?: string;
  caption?: string;
  audioLabel?: string;
  durationSec?: number;
  likes?: string;
  comments?: string;
};

export type AffiliateProduct = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  category: CategoryId;
  price: number;
  mrp: number;
  rating: number;
  reviewCount: number;
  badge?: string;
  images: string[];
  reel?: Reel;
  summary: string;
  highlights: string[];
  specs: [string, string][];
  colors?: string[];
  merchants: Merchant[];
  reviews: Review[];
};

const PLACEHOLDER_URL = (m: MerchantId) =>
  ({ amazon: "https://www.amazon.in/?tag=PLACEHOLDER",
     myntra: "https://www.myntra.com/?utm_source=PLACEHOLDER",
     nykaa:  "https://www.nykaa.com/?ref=PLACEHOLDER" }[m]);

export const products: AffiliateProduct[] = [
  {
    id: "p1",
    slug: "ai-translation-earbuds",
    title: "135-Language AI Translation Earbuds",
    subtitle: "Bluetooth 5.3 · HiFi Stereo · IPX5",
    category: "techland",
    price: 1299, mrp: 2999, rating: 4.6, reviewCount: 1284,
    badge: "Editor's pick",
    images: [
      "/products/ai-translation-earbuds/1.webp",
      "/products/ai-translation-earbuds/2.webp",
      "/products/ai-translation-earbuds/3.webp",
      "/products/ai-translation-earbuds/4.webp",
    ],
    reel: {
      src: "/products/ai-translation-earbuds/reel.mp4",
      caption: "Hands-on with the AI translation earbuds ✨",
      audioLabel: "Original audio · 1:24",
      likes: "12.4K", comments: "482",
    },
    summary:
      "Real-time translation in 135 languages, paired with HiFi stereo audio for travel, meetings, and study. All-day standby with smart noise filtering.",
    highlights: [
      "135 languages, 0.5s latency",
      "IPX5 sweat & rain resistant",
      "24h battery with charging case",
      "Bluetooth 5.3 stable pairing",
    ],
    specs: [
      ["Driver", "13mm dynamic"],
      ["Bluetooth", "5.3"],
      ["Battery (buds)", "6 hours"],
      ["Battery (case)", "24 hours"],
      ["Water rating", "IPX5"],
      ["Weight", "4.2g per bud"],
    ],
    colors: ["#0F172A", "#FFFFFF", "#94A3B8"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 1299, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
      { id: "myntra", label: "Myntra", price: 1349, eta: "2 days",   stock: "In stock", affiliateUrl: PLACEHOLDER_URL("myntra") },
    ],
    reviews: [
      { name: "Aarav S.", rating: 5, date: "12 days ago", title: "Incredible for travel",
        body: "Used these on a trip to Tokyo. The translation is fast enough for real conversations and the sound quality is way better than I expected at this price." },
      { name: "Mira P.",  rating: 4, date: "3 weeks ago", title: "Great value",
        body: "Battery life is everything they claim. Translation between Hindi and English is near-perfect; it stumbles a bit on regional accents." },
    ],
  },
  {
    id: "p2",
    slug: "mini-sleep-earbuds",
    title: "Bluetooth 5.3 Mini Sleep Earbuds",
    subtitle: "Invisible TWS · HD Sound · IPX5",
    category: "techland",
    price: 899, mrp: 1799, rating: 4.4, reviewCount: 562,
    images: [
      "/products/mini-sleep-earbuds/1.webp",
      "/products/mini-sleep-earbuds/2.webp",
      "/products/mini-sleep-earbuds/3.webp",
    ],
    summary: "Whisper-light buds designed for side-sleepers. Disappear in your ear and play softly through the night without falling out.",
    highlights: ["Sleeper-friendly fit", "HD audio chip", "IPX5 waterproof", "40h total battery"],
    specs: [
      ["Driver", "10mm"],
      ["Bluetooth", "5.3"],
      ["Battery", "8h + 32h case"],
      ["Weight", "3.1g per bud"],
    ],
    colors: ["#1E293B", "#F1F5F9"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 899, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
    ],
    reviews: [
      { name: "Devika R.", rating: 5, date: "5 days ago", title: "Finally I can sleep with podcasts",
        body: "I am a side sleeper and these are the first buds I can actually wear all night. Worth every rupee." },
    ],
  },
  {
    id: "p3",
    slug: "mens-grooming-kit",
    title: "Men's 3-in-1 Rechargeable Grooming Kit",
    subtitle: "Trimmer · Beard Clipper · Nose Shaver",
    category: "techland",
    price: 1499, mrp: 2499, rating: 4.5, reviewCount: 980,
    badge: "Bestseller",
    images: [
      "/products/mens-grooming-kit/1.webp",
      "/products/mens-grooming-kit/2.webp",
      "/products/mens-grooming-kit/3.webp",
    ],
    summary: "A full grooming kit in one tidy device. Swap heads for trimming, clipping, or nose detailing — USB-C rechargeable, travel-ready.",
    highlights: ["3 interchangeable heads", "USB-C fast charge", "60 min runtime", "Quiet motor"],
    specs: [
      ["Heads", "3 (trim/clip/nose)"],
      ["Battery", "60 min"],
      ["Charge", "USB-C, 90 min"],
      ["Warranty", "1 year"],
    ],
    colors: ["#0F172A", "#475569"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 1499, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
      { id: "myntra", label: "Myntra", price: 1599, eta: "2 days",   stock: "Few left", affiliateUrl: PLACEHOLDER_URL("myntra") },
    ],
    reviews: [
      { name: "Karan M.", rating: 5, date: "1 week ago", title: "Tidy and powerful",
        body: "Clean cut, didn't pull hairs. Battery lasted my whole travel week without recharge." },
    ],
  },
  {
    id: "p4",
    slug: "crystal-velvet-prayer-mat",
    title: "Elegant Crystal Velvet Prayer Mat",
    subtitle: "Premium pile · Anti-slip base · 70×110cm",
    category: "homely",
    price: 1199, mrp: 1999, rating: 4.8, reviewCount: 412,
    images: [
      "/products/crystal-velvet-prayer-mat/1.webp",
      "/products/crystal-velvet-prayer-mat/2.webp",
      "/products/crystal-velvet-prayer-mat/3.webp",
    ],
    reel: {
      src: "/products/crystal-velvet-prayer-mat/reel.mp4",
      caption: "Hands-on with the crystal velvet prayer mat ✨",
    },
    summary: "A soft, dense velvet prayer mat with a delicate crystal weave pattern and a cushioned anti-slip base for comfort during long sessions.",
    highlights: ["Plush velvet pile", "Anti-slip rubber base", "Hand-finished edges", "Machine washable"],
    specs: [
      ["Size", "70 × 110 cm"],
      ["Pile", "12mm velvet"],
      ["Weight", "1.4 kg"],
      ["Care", "Machine wash cold"],
    ],
    colors: ["#1E3A8A", "#7C2D12", "#064E3B"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 1199, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
    ],
    reviews: [
      { name: "Fatima A.", rating: 5, date: "2 weeks ago", title: "Beautiful and thick",
        body: "Far softer than expected. The crystal pattern is subtle and elegant; perfect gift for parents." },
    ],
  },
  {
    id: "p5",
    slug: "granite-cookware-set-7pc",
    title: "7-Piece Non-Stick Granite Cookware Set",
    subtitle: "Frying pans · Cooking pots · Induction-safe",
    category: "sufraan",
    price: 3699, mrp: 5999, rating: 4.5, reviewCount: 738,
    badge: "Curator's find",
    images: [
      "/products/granite-cookware-set-7pc/1.webp",
      "/products/granite-cookware-set-7pc/2.webp",
      "/products/granite-cookware-set-7pc/3.webp",
    ],
    reel: {
      src: "/products/granite-cookware-set-7pc/reel.mp4",
      caption: "Hands-on with the granite cookware set ✨",
    },
    summary: "Granite-coated, PFOA-free non-stick set built for everyday cooking. Sturdy aluminum body, tempered glass lids, induction & gas compatible.",
    highlights: ["7 piece complete set", "Granite non-stick coat", "Induction + gas safe", "Heat-resistant handles"],
    specs: [
      ["Pieces", "7"],
      ["Coating", "Granite non-stick"],
      ["Base", "Induction-compatible"],
      ["Lid", "Tempered glass"],
    ],
    colors: ["#1F2937", "#9CA3AF"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 3699, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
      { id: "myntra", label: "Myntra", price: 3899, eta: "3 days",   stock: "In stock", affiliateUrl: PLACEHOLDER_URL("myntra") },
    ],
    reviews: [
      { name: "Sunita V.", rating: 4, date: "6 days ago", title: "Heavy and well-built",
        body: "Heats evenly. The non-stick is genuinely non-stick. Worth the upgrade from my old set." },
    ],
  },
  {
    id: "p6",
    slug: "rechargeable-spray-bottle",
    title: "Rechargeable Spray Bottle Adapter",
    subtitle: "For watering, cleaning & disinfecting",
    category: "homely",
    price: 599, mrp: 1199, rating: 4.3, reviewCount: 256,
    images: [
      "/products/rechargeable-spray-bottle/1.webp",
      "/products/rechargeable-spray-bottle/2.webp",
    ],
    summary: "Clip onto any standard bottle and turn it into an electric mister. Perfect for plants, cleaning sprays, and disinfecting routines.",
    highlights: ["Fits standard bottles", "USB-C rechargeable", "Adjustable mist", "Lightweight"],
    specs: [
      ["Battery", "1500mAh"],
      ["Runtime", "45 min"],
      ["Fit", "Standard bottle threads"],
    ],
    colors: ["#FFFFFF", "#0EA5E9"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 599, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
    ],
    reviews: [
      { name: "Riya K.", rating: 4, date: "2 weeks ago", title: "Lifesaver for plants",
        body: "Saves so much time watering my balcony plants. Adjustable spray is great." },
    ],
  },
  {
    id: "p7",
    slug: "glow-serum-vitamin-c-20",
    title: "Glow Serum Vitamin C 20%",
    subtitle: "Brightening · 30ml · Cruelty-free",
    category: "glossy",
    price: 749, mrp: 1499, rating: 4.7, reviewCount: 2104,
    badge: "Trending",
    images: [
      "/products/glow-serum-vitamin-c-20/1.webp",
      "/products/glow-serum-vitamin-c-20/2.webp",
      "/products/glow-serum-vitamin-c-20/3.webp",
    ],
    reel: {
      src: "/products/glow-serum-vitamin-c-20/reel.mp4",
      caption: "Hands-on with the Glow Serum Vitamin C 20% ✨",
    },
    summary: "A stable 20% Vitamin C serum with hyaluronic acid and ferulic acid, formulated for daily morning use to brighten and even tone.",
    highlights: ["20% L-ascorbic acid", "+ Hyaluronic + Ferulic", "Suitable for all skin types", "30ml glass dropper"],
    specs: [
      ["Volume", "30ml"],
      ["Active", "20% Vitamin C"],
      ["pH", "3.5"],
      ["Cruelty-free", "Yes"],
    ],
    colors: ["#FED7AA", "#FFFBEB"],
    merchants: [
      { id: "nykaa",  label: "Nykaa",  price: 749, eta: "2 days",   stock: "In stock", affiliateUrl: PLACEHOLDER_URL("nykaa") },
      { id: "amazon", label: "Amazon", price: 799, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
    ],
    reviews: [
      { name: "Anaya G.", rating: 5, date: "4 days ago",  title: "Visible results in 2 weeks",
        body: "My dark spots are noticeably faded. No tingling, no breakouts. Will repurchase." },
      { name: "Priya N.", rating: 5, date: "3 weeks ago", title: "My new HG",
        body: "Beats serums 3x the price. Glass dropper feels premium." },
    ],
  },
  {
    id: "p8",
    slug: "hydrating-lip-oil-trio",
    title: "Hydrating Lip Oil Trio",
    subtitle: "3 shades · Plumping · Non-sticky",
    category: "glossy",
    price: 549, mrp: 999, rating: 4.5, reviewCount: 489,
    images: [
      "/products/hydrating-lip-oil-trio/1.webp",
      "/products/hydrating-lip-oil-trio/2.webp",
    ],
    summary: "Three glossy lip oils in flattering tints. Vitamin E and squalane keep lips soft without the sticky feel.",
    highlights: ["3 universal shades", "Non-sticky finish", "Plumping peptides", "Vegan formula"],
    specs: [
      ["Volume", "3 × 6ml"],
      ["Finish", "Glossy"],
      ["Vegan", "Yes"],
    ],
    colors: ["#F9A8D4", "#FCA5A5", "#FDBA74"],
    merchants: [
      { id: "nykaa", label: "Nykaa", price: 549, eta: "2 days", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("nykaa") },
    ],
    reviews: [
      { name: "Sneha L.", rating: 5, date: "1 week ago", title: "Pretty packaging, pretty colors",
        body: "All three shades wearable. The plumping is subtle but real." },
    ],
  },
  {
    id: "p9",
    slug: "linen-blend-oversized-shirt",
    title: "Linen-Blend Oversized Shirt",
    subtitle: "Unisex · 4 colors · Drop shoulder",
    category: "clothlink",
    price: 1299, mrp: 2299, rating: 4.4, reviewCount: 318,
    images: [
      "/products/linen-blend-oversized-shirt/1.webp",
      "/products/linen-blend-oversized-shirt/2.webp",
      "/products/linen-blend-oversized-shirt/3.webp",
    ],
    reel: {
      src: "/products/linen-blend-oversized-shirt/reel.mp4",
      caption: "Hands-on with the linen-blend oversized shirt ✨",
    },
    summary: "A breathable linen-cotton blend cut oversized with drop shoulders and pearl buttons. The everyday shirt that ages well.",
    highlights: ["55% linen, 45% cotton", "Drop shoulder fit", "Mother-of-pearl buttons", "Pre-washed for softness"],
    specs: [
      ["Fabric", "Linen-cotton blend"],
      ["Fit", "Oversized"],
      ["Care", "Cold wash, line dry"],
      ["Origin", "Made in India"],
    ],
    colors: ["#F5F5DC", "#1F2937", "#7C2D12", "#0F4C5C"],
    merchants: [
      { id: "myntra", label: "Myntra", price: 1299, eta: "2 days",   stock: "In stock", affiliateUrl: PLACEHOLDER_URL("myntra") },
      { id: "amazon", label: "Amazon", price: 1349, eta: "Tomorrow", stock: "Few left", affiliateUrl: PLACEHOLDER_URL("amazon") },
    ],
    reviews: [
      { name: "Vikram J.", rating: 5, date: "8 days ago", title: "Excellent fabric",
        body: "Heavier weight than I expected, in a good way. Drapes beautifully and doesn't crease too aggressively." },
    ],
  },
  {
    id: "p10",
    slug: "pleated-midi-skirt",
    title: "Pleated Midi Skirt",
    subtitle: "Satin finish · 5 colors · A-line",
    category: "clothlink",
    price: 1099, mrp: 1899, rating: 4.6, reviewCount: 421,
    images: [
      "/products/pleated-midi-skirt/1.webp",
      "/products/pleated-midi-skirt/2.webp",
    ],
    summary: "Floor-skimming pleated satin skirt with elastic waist comfort. A wardrobe workhorse that dresses up or down.",
    highlights: ["Satin pleats", "Elastic waist", "Midi length", "5 versatile colors"],
    specs: [
      ["Fabric", "Satin polyester"],
      ["Length", "Midi"],
      ["Care", "Hand wash cold"],
    ],
    colors: ["#0F172A", "#7C2D12", "#1E3A8A", "#365314", "#831843"],
    merchants: [
      { id: "myntra", label: "Myntra", price: 1099, eta: "2 days", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("myntra") },
    ],
    reviews: [
      { name: "Tanya B.", rating: 5, date: "2 weeks ago", title: "Twirls beautifully",
        body: "Looks much more expensive than it is. The emerald is gorgeous." },
    ],
  },
  {
    id: "p11",
    slug: "wooden-montessori-cube",
    title: "Wooden Montessori Activity Cube",
    subtitle: "6-in-1 · Ages 1-4 · Chemical-free",
    category: "kidzy",
    price: 1799, mrp: 2999, rating: 4.8, reviewCount: 891,
    badge: "Parents' choice",
    images: [
      "/products/wooden-montessori-cube/1.webp",
      "/products/wooden-montessori-cube/2.webp",
      "/products/wooden-montessori-cube/3.webp",
    ],
    summary: "Six developmental activities on one beautifully crafted wooden cube — beads, gears, shape sorter, abacus, and more. Built to last through siblings.",
    highlights: ["6 activities in one", "Hardwood, non-toxic paint", "Ages 1-4", "Heirloom-quality"],
    specs: [
      ["Material", "Beechwood"],
      ["Paint", "Water-based, non-toxic"],
      ["Age", "1-4 years"],
      ["Size", "30 × 30 × 35 cm"],
    ],
    colors: ["#FBBF24", "#EF4444", "#3B82F6"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 1799, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
    ],
    reviews: [
      { name: "Meera D.", rating: 5, date: "5 days ago", title: "Worth every rupee",
        body: "My toddler is obsessed. The wood is genuinely solid, paint is clearly non-toxic." },
    ],
  },
  {
    id: "p12",
    slug: "refillable-notebook-system",
    title: "Refillable Notebook System",
    subtitle: "A5 · Vegan leather · 3 inserts",
    category: "studify",
    price: 999, mrp: 1799, rating: 4.5, reviewCount: 267,
    images: [
      "/products/refillable-notebook-system/1.webp",
      "/products/refillable-notebook-system/2.webp",
    ],
    summary: "A refillable A5 notebook system with three swappable inserts — dotted, lined, and blank — held by a vegan leather cover that softens with use.",
    highlights: ["Refillable inserts", "Vegan leather cover", "100gsm fountain-pen-friendly paper", "Elastic closure"],
    specs: [
      ["Size", "A5"],
      ["Inserts", "3 (dot/line/blank)"],
      ["Paper", "100gsm"],
    ],
    colors: ["#1F2937", "#7C2D12", "#064E3B"],
    merchants: [
      { id: "amazon", label: "Amazon", price: 999, eta: "Tomorrow", stock: "In stock", affiliateUrl: PLACEHOLDER_URL("amazon") },
    ],
    reviews: [
      { name: "Rohan T.", rating: 5, date: "3 weeks ago", title: "Perfect for journaling",
        body: "No bleed-through with my fountain pens. The cover is breaking in beautifully." },
    ],
  },
];

export function findProduct(slug: string): AffiliateProduct | undefined {
  return products.find(p => p.slug === slug);
}

export function productsByCategory(id: CategoryId): AffiliateProduct[] {
  return products.filter(p => p.category === id);
}

export function relatedProducts(p: AffiliateProduct, limit = 4): AffiliateProduct[] {
  return products.filter(x => x.category === p.category && x.id !== p.id).slice(0, limit);
}
