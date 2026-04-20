type LookupResult = { city: string; state: string } | null;

const cache = new Map<string, { at: number; result: LookupResult }>();
const TTL = 24 * 60 * 60 * 1000;

export async function lookupPincode(pincode: string): Promise<LookupResult> {
  const cached = cache.get(pincode);
  if (cached && Date.now() - cached.at < TTL) return cached.result;

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, {
      next: { revalidate: 86400 },
    });
    const data = (await res.json()) as Array<{
      PostOffice?: Array<{ District: string; State: string }>;
    }>;
    const po = Array.isArray(data) ? data[0]?.PostOffice?.[0] : undefined;
    const result: LookupResult = po ? { city: po.District, state: po.State } : null;
    cache.set(pincode, { at: Date.now(), result });
    return result;
  } catch {
    return null;
  }
}
