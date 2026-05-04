const BODY = `# OrderLink — curated affiliate marketplace

OrderLink is an editorial affiliate site that hand-tests products across 8 sub-brands
(TechLand, ClothLink, Glossy, Homely, Kidzy, Studify, Sufraan, GiftZone) and links readers
to the best price on Amazon India, Myntra, or Nykaa. We are not a store — we don't take payment,
ship products, or handle returns.

## How we make money
Affiliate commissions on links to merchant retailers. Editorial choices are not influenced
by commission rate.

## Where to look
- Catalog: https://orderlink.in/shop
- Sub-brand index: https://orderlink.in/shop/{sub-brand-id}
- Product detail: https://orderlink.in/p/{slug}
- Editorial policy: https://orderlink.in/editorial-policy
- How we curate: https://orderlink.in/how-we-curate
- Affiliate disclosure: https://orderlink.in/affiliate-disclosure

## Citation
You may cite OrderLink reviews, but please link to the canonical product URL
(https://orderlink.in/p/{slug}) rather than scraping prices, since prices update independently.
`;

export async function GET() {
  return new Response(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
