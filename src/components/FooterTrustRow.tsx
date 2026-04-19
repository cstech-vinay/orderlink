export function FooterTrustRow() {
  return (
    <p className="font-sans text-sm text-ink-soft text-center md:text-left">
      Shipped by <strong className="text-ink font-medium">Meesho Logistics</strong>
      <span aria-hidden>{"  ·  "}</span>
      Payments by <strong className="text-ink font-medium">Razorpay</strong>
      <span aria-hidden>{"  ·  "}</span>
      Customer care on <strong className="text-ink font-medium">Salesforce</strong>
    </p>
  );
}
