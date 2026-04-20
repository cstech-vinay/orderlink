import fs from "node:fs/promises";
import path from "node:path";

let cache: Set<string> | null = null;

export async function loadPincodeWhitelist(): Promise<Set<string>> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public/pincodes.json");
  const raw = await fs.readFile(file, "utf-8");
  const parsed = JSON.parse(raw) as { pincodes: string[] };
  cache = new Set(parsed.pincodes);
  return cache;
}

export function isServiceablePincode(pincode: string): boolean {
  if (!/^\d{6}$/.test(pincode)) return false;
  if (!cache) return false;
  return cache.has(pincode);
}

// Test-only: reset module-level cache so tests can be re-run deterministically.
export function __resetPincodeCacheForTests(): void {
  cache = null;
}
