# FitTrack

FitTrack is a mobile-friendly, device-local fitness tracker built with Next.js, React, TypeScript, and IndexedDB.

## What it does

- Log workouts and personal records
- Track daily nutrition with **macro-only logging**
- Set editable calorie and macro targets
- Record body measurements, body fat, and progress photos
- Create workout templates and manage custom exercises
- Track bulk, cut, and maintenance phases in a calendar
- View analytics and trends
- Export and import your data manually
- Install as a PWA for an app-like experience

## Nutrition system

FitTrack now uses a **macro-only nutrition workflow**.

Instead of logging foods or meals, you directly log:

- calories
- protein
- carbs
- fat

This keeps nutrition tracking fast and simple, especially on mobile.

### Nutrition notes

- daily targets are stored locally in IndexedDB via the user profile
- daily entries are stored as macro logs
- old meal/food logging has been removed
- previous meal/food log data does not carry forward into the new macro-only system

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
- quick macro logging instead of food-by-food meal tracking
