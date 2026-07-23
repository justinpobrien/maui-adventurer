#!/usr/bin/env node
// Parses every markdown file under /content/attractions/<category>/*.md and
// upserts it into Firestore, keyed by slug. Firestore is the data layer the
// site reads from at build time — this script is how new/edited markdown
// gets there.
//
// Usage:
//   npm run sync-content
//
// Credentials: set FIREBASE_SERVICE_ACCOUNT (JSON string) or
// GOOGLE_APPLICATION_CREDENTIALS (path to a service account file), or point
// FIRESTORE_EMULATOR_HOST at a local emulator for testing.

import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONTENT_DIR = path.resolve(__dirname, '../../content/attractions');
const COLLECTION = 'attractions';

const REQUIRED_FIELDS = ['slug', 'name', 'category', 'region', 'min_time_minutes'];

function initAdmin() {
  if (getApps().length) return;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountJson) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } else {
    initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID });
  }
}

async function findMarkdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return findMarkdownFiles(fullPath);
      return entry.name.endsWith('.md') ? [fullPath] : [];
    })
  );
  return files.flat();
}

function parseAttraction(filePath, raw) {
  const { data, content } = matter(raw);
  const missing = REQUIRED_FIELDS.filter((field) => data[field] === undefined);
  if (missing.length) {
    throw new Error(`${filePath}: missing required frontmatter field(s): ${missing.join(', ')}`);
  }
  return {
    ...data,
    tags: data.tags ?? [],
    tips: data.tips ?? [],
    kid_friendly: Boolean(data.kid_friendly),
    // Strip the trailing "Sources: ..." line — authoring metadata, not shown in the UI.
    body: content.replace(/\n?Sources:.*$/is, '').trim(),
  };
}

async function main() {
  initAdmin();
  const db = getFirestore();

  const files = await findMarkdownFiles(CONTENT_DIR);
  if (files.length === 0) {
    console.warn(`No markdown files found under ${CONTENT_DIR}`);
    return;
  }

  let written = 0;
  let batch = db.batch();
  let batchSize = 0;

  for (const filePath of files) {
    const raw = await readFile(filePath, 'utf-8');
    const attraction = parseAttraction(filePath, raw);
    const ref = db.collection(COLLECTION).doc(attraction.slug);
    batch.set(ref, attraction, { merge: false });
    batchSize += 1;
    written += 1;

    if (batchSize === 400) {
      await batch.commit();
      batch = db.batch();
      batchSize = 0;
    }
  }

  if (batchSize > 0) await batch.commit();

  console.log(`Synced ${written} attraction(s) from ${files.length} markdown file(s) into "${COLLECTION}".`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
