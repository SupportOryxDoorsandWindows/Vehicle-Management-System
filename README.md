# Vehicle Management System — Phase 1

A fleet vehicle and cost-tracking system built for Oryx Doors & Windows. Phase 1 covers the vehicle register, expense tracking, maintenance/document/finance tabs, and cost-of-ownership reporting, backed by Supabase.

## Getting started

```bash
npm install
cp .env.example .env   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

## Testing

- `npm test` — the hermetic unit/component suite. No network access required; safe to run on a fresh clone, in CI, or offline.
- `npm run test:integration` — integration tests that hit the live Supabase project directly using the credentials in `.env`. Requires network access and a configured `.env`.

## Building

```bash
npm run build
```

## Data notes

- `data/source/*.xlsx` are the original spreadsheet fixtures used to generate the seed data (see `scripts/import/`).
- `supabase/seed/seed_data.sql` is deliberately gitignored — it contains real driver names and cost figures and must not be committed.

## Further reading

Design spec and implementation plan live under `docs/superpowers/specs/` and `docs/superpowers/plans/`.
