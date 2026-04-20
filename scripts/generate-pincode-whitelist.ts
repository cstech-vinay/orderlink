import fs from "node:fs/promises";
import path from "node:path";

// Phase 2a: seed with metro + Tier-1 pincodes. Before launch, replace with the
// full ~28k-pincode list from data.gov.in's PIN Code Directory CSV.
const SEED = [
  "400001", "400014", "400050", "400076", // Mumbai
  "411001", "411014", "411038", "411057", // Pune
  "110001", "110016", "110024", "110070", // Delhi
  "122001", "122018",                       // Gurugram
  "201301", "201304",                       // Noida
  "560001", "560034", "560068", "560076", // Bengaluru
  "600001", "600017", "600042",             // Chennai
  "700001", "700019", "700091",             // Kolkata
  "500001", "500032", "500081",             // Hyderabad
  "380001", "380015", "380054",             // Ahmedabad
  "302001", "302012",                       // Jaipur
  "226001", "226010",                       // Lucknow
  "160001", "160017",                       // Chandigarh
  "641001",                                 // Coimbatore
  "682001",                                 // Kochi
  "751001",                                 // Bhubaneswar
  "800001",                                 // Patna
  "141001",                                 // Ludhiana
  "452001",                                 // Indore
  "462001",                                 // Bhopal
  "440001",                                 // Nagpur
  "248001",                                 // Dehradun
  "781001",                                 // Guwahati
  "395001",                                 // Surat
  "390001",                                 // Vadodara
  "403001",                                 // Goa
];

async function main() {
  const outPath = path.join(process.cwd(), "public/pincodes.json");
  const payload = {
    generatedAt: new Date().toISOString(),
    count: SEED.length,
    note: "Seed list for Phase 2a. Replace with full PIN Code Directory before launch.",
    pincodes: [...new Set(SEED)].sort(),
  };
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${payload.pincodes.length} pincodes to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
