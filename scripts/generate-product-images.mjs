#!/usr/bin/env node
/**
 * OrderLink product-image generator.
 *
 * Reads reference images from assets/products/<slug>/ and generates the full
 * content bundle (1 thumbnail + 6 PDP + 3 feed + 3 story) for a product,
 * using ONE Gemini chat session per product so visual context carries
 * across the set. Outputs optimized WebPs to public/assets/products/<slug>/.
 *
 * Usage:
 *   node scripts/generate-product-images.mjs <slug>
 *   npm run generate:images -- <slug>
 *
 * Requires: .env.local with GEMINI_API_KEY and GEMINI_IMAGE_MODEL.
 */

import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

// ---------- env loading ----------
async function loadEnvLocal() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  const raw = await fs.readFile(envPath, "utf8").catch(() => "");
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

// ---------- logging ----------
const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};
const log = {
  info: (...a) => console.log(c.cyan("[info]"), ...a),
  ok: (...a) => console.log(c.green("[ok]"), ...a),
  warn: (...a) => console.log(c.yellow("[warn]"), ...a),
  err: (...a) => console.log(c.red("[err]"), ...a),
  step: (s) => console.log("\n" + c.bold("▶ " + s)),
};

// ---------- args ----------
const slug = process.argv[2];
if (!slug) {
  log.err("usage: node scripts/generate-product-images.mjs <slug>");
  process.exit(1);
}

// ---------- paths ----------
const refDir = path.join(REPO_ROOT, "assets", "products", slug);
const outDir = path.join(REPO_ROOT, "public", "assets", "products", slug);
const rawDir = path.join(outDir, "generated");

// ---------- reference image prep ----------
const REF_EXTS = [".png", ".jpg", ".jpeg", ".webp", ".avif"];
const MAX_REF_DIM = 1024; // downscale large refs before sending

async function loadReferenceImages() {
  const entries = await fs.readdir(refDir).catch(() => []);
  const refs = entries
    .filter((f) => REF_EXTS.includes(path.extname(f).toLowerCase()))
    .map((f) => path.join(refDir, f));
  if (refs.length === 0) {
    throw new Error(`No reference images found in ${refDir}`);
  }
  // Pick the 3 largest files (likely highest detail)
  const withSizes = await Promise.all(
    refs.map(async (p) => ({ p, size: (await fs.stat(p)).size }))
  );
  withSizes.sort((a, b) => b.size - a.size);
  const picks = withSizes.slice(0, 3).map((x) => x.p);
  log.info(
    `reference images picked (${picks.length} of ${refs.length}):`,
    picks.map((p) => path.basename(p)).join(", ")
  );

  // Normalize each: resize to max 1024 dim, re-encode as JPEG (smaller payloads)
  const prepared = [];
  for (const p of picks) {
    const buf = await sharp(p, { failOn: "none" })
      .resize({ width: MAX_REF_DIM, height: MAX_REF_DIM, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 88 })
      .toBuffer();
    prepared.push({ mimeType: "image/jpeg", data: buf.toString("base64") });
  }
  return prepared;
}

// ---------- image extraction from Gemini response ----------
function extractImages(resp) {
  const out = [];
  const candidates = resp?.candidates || [];
  for (const cand of candidates) {
    const parts = cand?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        out.push({
          mimeType: part.inlineData.mimeType || "image/png",
          data: Buffer.from(part.inlineData.data, "base64"),
        });
      }
    }
  }
  return out;
}

function extractText(resp) {
  const candidates = resp?.candidates || [];
  const texts = [];
  for (const cand of candidates) {
    const parts = cand?.content?.parts || [];
    for (const part of parts) {
      if (part.text) texts.push(part.text);
    }
  }
  return texts.join("\n").trim();
}

// ---------- main ----------
async function main() {
  log.step(`generating images for slug: ${slug}`);

  await loadEnvLocal();
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image-preview";
  if (!apiKey || apiKey === "CHANGE_ME") {
    log.err("GEMINI_API_KEY missing in .env.local");
    process.exit(1);
  }
  log.info("model:", model);

  // Load per-product prompts
  let promptsModule;
  try {
    promptsModule = await import(pathToFileURL(path.join(__dirname, "prompts", `${slug}.mjs`)).href);
  } catch (err) {
    log.err(`no prompts module at scripts/prompts/${slug}.mjs — create one first`);
    log.err(err.message);
    process.exit(1);
  }
  const { prompts, sharedPreamble } = promptsModule;
  log.info(`prompts loaded: ${prompts.length}`);

  // Ensure output dirs exist
  await fs.mkdir(rawDir, { recursive: true });

  // Prep references
  const refImages = await loadReferenceImages();

  // Open chat session
  const ai = new GoogleGenAI({ apiKey });
  const chat = ai.chats.create({
    model,
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  // First turn: preamble + reference images (no image requested back)
  log.step("priming chat with brand preamble + reference images");
  const primeParts = [{ text: sharedPreamble }, ...refImages.map((ri) => ({ inlineData: ri }))];
  try {
    const primeResp = await chat.sendMessage({
      message: primeParts,
      config: { responseModalities: ["TEXT"] },
    });
    const primeText = extractText(primeResp);
    log.ok("prime ack:", primeText.slice(0, 160).replace(/\s+/g, " ") || "(no text returned)");
  } catch (err) {
    log.err("failed to prime chat:", err.message);
    if (err.status === 404 || /not found/i.test(err.message)) {
      log.warn(
        `model "${model}" not found — set GEMINI_IMAGE_MODEL in .env.local to a valid image-gen model (e.g. gemini-2.5-flash-image-preview)`
      );
    }
    process.exit(1);
  }

  // Iterate prompts
  const results = [];
  for (let i = 0; i < prompts.length; i++) {
    const spec = prompts[i];
    const outWebp = path.join(outDir, `${spec.id}.webp`);
    const outRawPng = path.join(rawDir, `${spec.id}.png`);

    // Resumability: skip if optimized output already exists
    const existing = await fs.stat(outWebp).catch(() => null);
    if (existing) {
      log.info(`[${i + 1}/${prompts.length}] ${spec.id} — already exists, skipping`);
      results.push({ id: spec.id, status: "skipped", webp: outWebp });
      continue;
    }

    log.step(`[${i + 1}/${prompts.length}] generating ${spec.id} (${spec.aspectRatio})`);
    try {
      const resp = await chat.sendMessage({
        message: [{ text: spec.prompt }],
        config: {
          responseModalities: ["IMAGE", "TEXT"],
          imageConfig: { aspectRatio: spec.aspectRatio },
        },
      });
      const images = extractImages(resp);
      const text = extractText(resp);
      if (images.length === 0) {
        log.warn(`no image returned; model said:`, text.slice(0, 240));
        results.push({ id: spec.id, status: "no-image", text });
        continue;
      }
      const raw = images[0].data;
      await fs.writeFile(outRawPng, raw);

      // Optimize to WebP at target dimensions
      await sharp(raw)
        .resize(spec.outWidth, spec.outHeight, { fit: "cover", position: "attention" })
        .webp({ quality: 85 })
        .toFile(outWebp);

      const sz = (await fs.stat(outWebp)).size;
      log.ok(`${spec.id}.webp (${(sz / 1024).toFixed(1)} KB)`);
      results.push({
        id: spec.id,
        status: "ok",
        webp: outWebp,
        raw: outRawPng,
        kind: spec.kind,
        alt: spec.alt,
        outWidth: spec.outWidth,
        outHeight: spec.outHeight,
      });
    } catch (err) {
      log.err(`${spec.id} failed:`, err.message);
      results.push({ id: spec.id, status: "error", error: err.message });
    }
  }

  // Write manifest for the wiring step
  const manifest = {
    slug,
    generatedAt: new Date().toISOString(),
    model,
    results,
  };
  await fs.writeFile(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  // Summary
  log.step("summary");
  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "error" || r.status === "no-image").length;
  log.info(`ok: ${ok}, skipped: ${skipped}, failed: ${failed}`);
  log.info(`manifest: ${path.relative(REPO_ROOT, path.join(outDir, "manifest.json"))}`);
  if (failed > 0) {
    log.warn("failures:");
    for (const r of results.filter((r) => r.status === "error" || r.status === "no-image")) {
      log.warn(`  - ${r.id}: ${r.error || r.text?.slice(0, 120) || "unknown"}`);
    }
    log.warn("reference images preserved in assets/products/" + slug + "/ so you can re-run");
    process.exit(2);
  }

  // All generations succeeded — clear reference images per workflow convention
  log.step("clearing reference images");
  try {
    const files = await fs.readdir(refDir);
    let removed = 0;
    for (const f of files) {
      const fp = path.join(refDir, f);
      const st = await fs.stat(fp);
      if (st.isFile()) {
        await fs.unlink(fp);
        removed++;
      }
    }
    log.ok(`removed ${removed} reference file(s) from ${path.relative(REPO_ROOT, refDir)}`);
  } catch (err) {
    log.warn("ref cleanup failed:", err.message);
  }
}

main().catch((err) => {
  log.err("fatal:", err.stack || err.message);
  process.exit(1);
});
