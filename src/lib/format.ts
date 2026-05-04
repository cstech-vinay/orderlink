export function formatRupees(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function percentOff(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round((1 - price / mrp) * 100);
}
