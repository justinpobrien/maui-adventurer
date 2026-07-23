#!/usr/bin/env node
// Generates a placeholder image for every published attraction using OpenAI
// gpt-image-1, keyed by slug, then derives a smaller card thumbnail locally
// with sharp. One API call per attraction; two files written:
//
//   app/public/images/attractions/<slug>.webp        hero  (1200x800) — article view
//   app/public/images/attractions/<slug>-thumb.webp  thumb ( 600x400) — card grid
//
// Reads the `image_prompt` frontmatter field from each markdown file under
// content/attractions/ (the same set sync-content publishes — content/_flagged
// is intentionally skipped).
//
// Usage:
//   OPENAI_API_KEY=sk-... node scripts/generate-images.mjs [options]
//
// Options:
//   --limit N     only process the first N attractions (test runs; e.g. --limit 1)
//   --only SLUG   only process one attraction by slug (repeatable)
//   --force       regenerate even if output files already exist (default: skip)
//   --concurrency N   parallel API calls (default 3)
//   --quality Q   low | medium | high (default medium)
//   --dry-run     list what would be generated; make no API calls
//
// Idempotent/resumable: existing outputs are skipped unless --force, so a rerun
// after a failure only fills the gaps.

import { readFile, readdir, mkdir, access } from 'node:fs/promises';
import { constants as FS } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../../content/attractions');
const OUT_DIR = path.resolve(__dirname, '../public/images/attractions');

const HERO = { w: 1200, h: 800, quality: 80 };
const THUMB = { w: 600, h: 400, quality: 72 };
const API_SIZE = '1536x1024'; // gpt-image-1 landscape; downscaled locally
const PROMPT_SUFFIX = ' Natural photography, realistic lighting, no text, no watermark, no border.';

// ---- args ----------------------------------------------------------------
const args = process.argv.slice(2);
const hasFlag = (f) => args.includes(f);
const getOpt = (f, d) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i + 1] ? args[i + 1] : d;
};
const LIMIT = getOpt('--limit') ? Number(getOpt('--limit')) : Infinity;
const ONLY = args.reduce((acc, a, i) => (a === '--only' && args[i + 1] ? [...acc, args[i + 1]] : acc), []);
const FORCE = hasFlag('--force');
const DRY_RUN = hasFlag('--dry-run');
const CONCURRENCY = Number(getOpt('--concurrency', '3'));
const QUALITY = getOpt('--quality', 'medium');

// ---- helpers -------------------------------------------------------------
async function findMarkdown(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const out = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await findMarkdown(full)));
    else if (e.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const exists = (p) =>
  access(p, FS.F_OK)
    .then(() => true)
    .catch(() => false);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function generateImage(prompt, attempt = 1) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt: prompt + PROMPT_SUFFIX,
      size: API_SIZE,
      quality: QUALITY,
      n: 1,
    }),
  });

  if (res.ok) {
    const json = await res.json();
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error('response had no image data');
    return Buffer.from(b64, 'base64');
  }

  const bodyText = await res.text();
  // Retry on rate limit / transient server errors with backoff.
  if ((res.status === 429 || res.status >= 500) && attempt <= 5) {
    const wait = Math.min(30000, 2000 * 2 ** (attempt - 1));
    console.warn(`  ↻ ${res.status}, retry ${attempt}/5 in ${wait / 1000}s`);
    await sleep(wait);
    return generateImage(prompt, attempt + 1);
  }
  throw new Error(`OpenAI ${res.status}: ${bodyText.slice(0, 300)}`);
}

async function writeVariants(buf, slug) {
  const heroPath = path.join(OUT_DIR, `${slug}.webp`);
  const thumbPath = path.join(OUT_DIR, `${slug}-thumb.webp`);
  await sharp(buf).resize(HERO.w, HERO.h, { fit: 'cover' }).webp({ quality: HERO.quality }).toFile(heroPath);
  await sharp(buf).resize(THUMB.w, THUMB.h, { fit: 'cover' }).webp({ quality: THUMB.quality }).toFile(thumbPath);
}

// ---- main ----------------------------------------------------------------
async function main() {
  if (!DRY_RUN && !process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set. Export it (or use --dry-run).');
    process.exit(1);
  }
  await mkdir(OUT_DIR, { recursive: true });

  const files = (await findMarkdown(CONTENT_DIR)).sort();
  let items = [];
  for (const file of files) {
    const { data } = matter(await readFile(file, 'utf-8'));
    if (!data.slug || !data.image_prompt) {
      console.warn(`skip (no slug/image_prompt): ${path.relative(CONTENT_DIR, file)}`);
      continue;
    }
    items.push({ slug: data.slug, prompt: String(data.image_prompt) });
  }
  if (ONLY.length) items = items.filter((it) => ONLY.includes(it.slug));
  if (Number.isFinite(LIMIT)) items = items.slice(0, LIMIT);

  // Skip already-generated unless --force.
  const todo = [];
  let skipped = 0;
  for (const it of items) {
    const done = (await exists(path.join(OUT_DIR, `${it.slug}.webp`))) && (await exists(path.join(OUT_DIR, `${it.slug}-thumb.webp`)));
    if (done && !FORCE) skipped += 1;
    else todo.push(it);
  }

  console.log(`Attractions: ${items.length} | to generate: ${todo.length} | already done (skipped): ${skipped}`);
  console.log(`Model: gpt-image-1 @ ${API_SIZE} quality=${QUALITY} | concurrency=${CONCURRENCY}${DRY_RUN ? ' | DRY RUN' : ''}\n`);

  if (DRY_RUN) {
    todo.forEach((it) => console.log(`  would generate: ${it.slug}`));
    return;
  }

  let done = 0;
  let failed = 0;
  const queue = [...todo];
  async function worker() {
    while (queue.length) {
      const it = queue.shift();
      if (!it) break;
      try {
        const buf = await generateImage(it.prompt);
        await writeVariants(buf, it.slug);
        done += 1;
        console.log(`  ✓ [${done + failed}/${todo.length}] ${it.slug}`);
      } catch (err) {
        failed += 1;
        console.error(`  ✗ ${it.slug}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, () => worker()));

  console.log(`\nDone. generated=${done} failed=${failed} skipped=${skipped}. Output: ${path.relative(process.cwd(), OUT_DIR)}`);
  if (failed) {
    console.log('Rerun the same command to retry only the failed ones (existing files are skipped).');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
