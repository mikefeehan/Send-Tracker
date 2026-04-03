# 🍹 Maui Send Tracker

A real-time party drink tracking app built for weekend send sessions in Maui. Compete with friends, log your drinks with photo proof, and see who's the biggest sender.

**Live at:** [maui-send-tracker.web.app](https://maui-send-tracker.web.app)

## Features

- **Real-time leaderboard** — see who's winning as drinks get logged
- **Photo-required submissions** — every drink needs proof
- **AI photo bouncer** — Claude Vision scans every photo, rejects water/soda/fake pics
- **Rate limiting** — max 1 drink per 2 min, 5 per hour
- **Interactive map** — see where drinks are being logged across Maui
- **Live feed** — like and comment on friends' drinks
- **Edit & delete** — fix mistakes or remove drinks
- **Quantity selector** — log multiple drinks in one post
- **Badges & achievements** — earn badges for milestones
- **Weekend recap** — stats and highlights
- **PWA** — install to home screen, works like a native app
- **Admin panel** — manage users and post announcements (`?admin` in URL)

## Point System

| Drink | Points |
|-------|--------|
| 🍺 Beer / Seltzer / Wine | 1.5 |
| 🍹 Cocktail | 2 |
| 🥃 Shot | 2.5 |

## Tech Stack

- **Frontend:** React 18 + Vite + Tailwind CSS
- **Backend:** Firebase (Hosting, Firestore, Storage, Cloud Functions)
- **AI:** Claude Vision API (Anthropic) for photo verification
- **Maps:** Leaflet + OpenStreetMap

## Setup

```bash
npm install
cp .env.example .env  # add your Firebase + Anthropic keys
npm run dev
```

## Deploy

```bash
npm run build
firebase deploy --project maui-send-tracker
```

## Admin

Access the admin panel at `maui-send-tracker.web.app?admin` (PIN: 2026)
