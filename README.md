# FitTrack

FitTrack is a mobile-friendly, device-local fitness tracker built with Next.js, React, TypeScript, and IndexedDB.

## What it does

- Log workouts and personal records
- Track meals and daily nutrition
- Record body measurements and progress photos
- Create workout programs and templates
- View analytics and trends
- Export and import your data manually
- Install as a PWA for an app-like experience

## Product direction

FitTrack is intentionally **local-first**:

- no required account
- no backend database
- no SaaS sync dependency
- data stays on your device unless you export it

## Tech stack

- Next.js App Router
- React + TypeScript
- Tailwind CSS
- IndexedDB via `idb`
- Chart.js

## Development

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Data model

FitTrack stores app data in IndexedDB on the device. Backup/export tools are available in Settings.

## Current focus

This version emphasizes:

- mobile usability
- offline-friendly local storage
- fast personal tracking
- simple manual backup/export
