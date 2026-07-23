# Maui Content Library

Astro + React implementation of the "Maui Content Library" design
(`project/Maui Content Library.dc.html` in the repo root) — a searchable,
filterable article grid with a detail view, built to read from Firestore.

## How it fits together

- **Source of truth**: markdown files under `/content/attractions/<category>/*.md`
  (one file per article, frontmatter + a 2–4 paragraph body — see any existing
  file for the exact schema).
- **Data layer**: Firestore. `npm run sync-content` parses the markdown and
  upserts each article into a Firestore `attractions` collection, keyed by
  slug.
- **Site**: a static Astro page (`src/pages/index.astro`) fetches all
  attractions from Firestore at *build time* (via `firebase-admin`) and
  passes them as props into a single interactive React island
  (`src/components/ContentLibrary.tsx`) that handles search, category
  filtering, and the article detail view entirely client-side — no page
  navigation, matching the original design.

Only the build process talks to Firestore. The deployed site never makes a
client-side Firestore call, so `firestore.rules` denies all client reads —
there's nothing for a client to read.

## Setup

```bash
npm install
cp .env.example .env   # fill in Firebase credentials
```

Two ways to authenticate against Firestore (`sync-content` and `astro build`
both use these):

- Set `FIREBASE_SERVICE_ACCOUNT` to a service account JSON string, **or**
- Set `GOOGLE_APPLICATION_CREDENTIALS` to a service account file path (and
  `FIREBASE_PROJECT_ID`).

For local development without touching production data, run against the
Firestore emulator instead:

```bash
npm run emulators                                    # starts the Firestore emulator
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run sync-content
FIRESTORE_EMULATOR_HOST=localhost:8080 npm run dev
```

## Adding the real content set

18 placeholder articles (2 per category) are seeded in `/content/attractions/`
so the pipeline runs end-to-end. Replace them with the real 200 markdown
files — same directory structure, same frontmatter schema — then run
`npm run sync-content` to push them into Firestore. No code changes needed;
the schema in `src/lib/types.ts` already matches.

## Category taxonomy

The design's 6 example categories were extended to the real 9-category
taxonomy (`src/lib/categories.ts`): beaches, hikes, waterfalls, snorkel-dive,
restaurants, towns-culture, tours-activities, viewpoints-scenic,
kid-friendly-rainy-day — each with its own color in the tropical palette.

## Fields derived at read time (not in the frontmatter schema)

`src/lib/content.ts` derives what the design needs but the schema doesn't
have directly:

- `location` — formatted from `region`
- `summary` (card blurb) — first sentence of the body, truncated
- `overview` (detail body) — full markdown body, with the trailing
  `Sources:` line stripped
- `readTime` — computed from word count (~200 wpm)
- **"Trip details"** replaces the design's "Best time to visit" block (no
  such field exists in the schema) — built from `min_time_minutes`,
  `difficulty`, `price`/`price_range`, and `kid_friendly`, whichever are
  present.

## Scripts

- `npm run dev` — local dev server
- `npm run build` — static production build to `dist/`
- `npm run preview` — serve the production build locally
- `npm run sync-content` — parse `/content/attractions/` and upsert into Firestore
- `npm run emulators` — start the Firestore emulator

## Deploying

```bash
npm run build
npx firebase deploy --only hosting   # after setting the real project id in .firebaserc
```
