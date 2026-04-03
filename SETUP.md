# Maui Send Tracker AI — Setup Guide

## 1. Firebase Setup (5 minutes)

### a) Create a Firebase Project
1. Go to https://console.firebase.google.com
2. Click **"Add project"** → name it `maui-send-tracker` → click through
3. Disable Google Analytics (not needed) → **Create project**

### b) Enable Firestore
1. In the left sidebar → **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in test mode** (allows all reads/writes — fine for a weekend event)
4. Select a region (us-central1 is fine) → **Done**

### c) Enable Storage
1. Left sidebar → **Build → Storage**
2. Click **Get started**
3. Choose **Start in test mode** → **Done**

### d) Get your config
1. Left sidebar → **Project settings** (gear icon) → **General** tab
2. Scroll to **Your apps** → click **</>** (Web) icon
3. Register the app (any nickname) — skip Firebase Hosting
4. Copy the `firebaseConfig` object

### e) Paste config into the app
Open `src/firebase.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...",
}
```

---

## 2. Run Locally

```bash
# Install dependencies (first time only)
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 3. Deploy to Vercel (2 minutes)

### Option A — Vercel CLI (easiest)
```bash
npm install -g vercel
vercel
```
Follow the prompts. It auto-detects Vite. Done.

### Option B — Vercel Dashboard
1. Push this folder to a GitHub repo
2. Go to https://vercel.com → **New Project** → Import your repo
3. Framework preset: **Vite** (auto-detected)
4. Click **Deploy**

Your app will be live at `https://your-project.vercel.app` in ~1 minute.

---

## Firestore Security (optional, for production)

If you want to lock down the database before the event, replace the default rules in
Firebase Console → Firestore → Rules with:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /drinks/{docId} {
      allow read: if true;
      allow create: if request.resource.data.keys().hasAll([
        'userId', 'name', 'imageUrl', 'drinkType', 'points', 'day', 'createdAt'
      ]);
    }
  }
}
```

And for Storage → Rules:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /drinks/{allPaths=**} {
      allow read: if true;
      allow write: if request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
  }
}
```
