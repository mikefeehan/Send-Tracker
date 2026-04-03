# 🍹 Maui Send Tracker — Deployment Guide

This guide walks you through deploying the app for production with your friends.

---

## 📋 Pre-Deployment Checklist

- [x] Firebase security rules configured (`firestore.rules`, `storage.rules`)
- [x] Environment variables set up (`.env`)
- [x] Error Boundary in place (graceful error handling)
- [x] Demo data can be toggled on/off
- [x] Firestore query limits set (max 200 drinks)
- [x] Mobile-first responsive design
- [x] Achievement badges system implemented
- [x] PWA install prompts configured
- [x] Image uploads capped at 10MB

---

## 🚀 Setup for Production

### 1. **Turn Off Demo Mode**

The app currently runs with demo data. To switch to production mode:

**Option A: Using the App (Recommended)**
- Set in `.env`:
  ```
  VITE_DEMO_MODE=false
  ```
- Rebuild and deploy

**Option B: Toggle Back to Demo**
- To test with demo data again:
  ```
  VITE_DEMO_MODE=true
  ```

### 2. **Deploy to Firebase Hosting**

```bash
# Install Firebase CLI (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (from project root)
firebase init hosting

# Build the app
npm run build

# Deploy
firebase deploy
```

This will deploy to: `https://maui-send-tracker.web.app`

### 3. **Security Rules in Firebase Console**

The security rules are already configured in `firestore.rules` and `storage.rules`. To apply them:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select **maui-send-tracker** project
3. **Firestore Database** → **Rules** tab → Copy contents of `firestore.rules` → Publish
4. **Storage** → **Rules** tab → Copy contents of `storage.rules` → Publish

---

## 📱 Share with Friends

### Desktop/Mobile Web Link
```
https://maui-send-tracker.web.app
```

### Mobile App Install

**Android:**
1. Open link in Chrome
2. Tap the 3-dot menu → "Add to Home Screen"
3. App appears as standalone icon

**iOS (Safari):**
1. Open link in Safari
2. Tap Share → "Add to Home Screen"
3. App appears as standalone icon

**Desktop:**
1. Open link in Chrome
2. Click the install icon (top-right address bar)
3. Or: Chrome menu → "Install app"

---

## 🎮 Feature Overview for Friends

### Leaderboard
- Tracks points per person per day (Thursday/Friday/Saturday)
- Beer = 1 point, Cocktail/Shot = 2 points
- See who's winning **this day** and **overall**

### Badges 👑
Your friends will earn achievement badges:
- **👑 King of the Day** — Ranked #1 for a day
- **🚀 On a Heater** — 5+ drinks in one day
- **🥴 Questionable Decisions** — 4+ drinks midnight–5am
- **💥 Send It** — 3 drinks in 30 minutes
- **🎩 Hat Trick** — 3+ drinks in one day
- **📈 Climber** — Moved up 2+ spots in an hour
- **🩸 First Blood** — First drink logged that day
- **📸 Proof or It Didn't Happen** — Logged a photo
- **🌇 Golden Hour** — Drink logged 5pm–7pm
- **🦉 Night Owl** — Drink logged midnight–5am

### Map View
- All logged drinks appear on a map of Maui
- Profile pictures instead of boring blue pins
- Tap to see details

### Feed
- Chronological feed of all drinks
- Like drinks (❤️)
- Add comments

---

## 🔐 Privacy & Security

- **No accounts needed** — Just enter your name and photo
- **Firebase Firestore** — All data stored securely in Google Cloud
- **Image uploads** — Capped at 10MB, image-only
- **Firestore security** — Public read, private write (can't delete others' drinks)
- **No ads, no tracking** — Just fun with friends

---

## 🛠️ If Issues Arise

### "Something went wrong" Error
- Pull down to refresh or tap **Reload App**
- Check your internet connection
- If it persists, clear app data: Settings → Apps → Maui Send Tracker → Clear Data

### Photos Won't Upload
- Make sure file is under 10MB
- Try a JPG instead of PNG
- Check internet connection

### Map Not Loading
- The map requires location permission
- Tap the 📍 button to grant access

### Points Not Updating
- Wait 2–3 seconds (real-time sync)
- Refresh the app (pull down)

---

## 📊 Customization Ideas

Want to tweak for your group? Here are some options:

**Change Event Days:**
- Edit `src/App.jsx` lines 18–22 in `getMauiDay()`
- Update day names in `src/utils/badges.js` line 34

**Adjust Point Values:**
- Edit `firestore.rules` line 20 to change valid points: `[1, 2, 3]`
- Update drink types in UI as needed

**Add More Badges:**
- Create new badge in `src/utils/badges.js` `BADGE_DEFS`
- Add emoji and check logic

**Change Colors:**
- Edit `src/index.css` for global styles
- Modify Tailwind classes in components

---

## 🎯 Next Steps

1. **Deploy to Firebase** (instructions above)
2. **Send link to friends** → `https://maui-send-tracker.web.app`
3. **Each friend sets up profile** (name + optional photo)
4. **Start logging drinks!** 🍹

---

## ❓ FAQ

**Q: Can I see who liked my drink?**
A: Not yet — you just see the total likes. Could add this in future versions!

**Q: Can I delete my drink?**
A: No — once logged, it's locked in. This prevents cheating/disputes. 😄

**Q: Does location sharing work?**
A: Yes! Your location is detected when you log a drink, but it's not shared in real-time with others — just shown on the map.

**Q: Can I use this on multiple devices?**
A: Sort of — your profile is tied to the device you sign up on. To use on another device, sign up again (you can use the same name).

**Q: Is this available in the App Store?**
A: Not yet! It's a web app for now. Install to your home screen for app-like experience.

---

**Questions?** Check the console for any errors (`Right-click → Inspect → Console`). Happy sending! 🍹🎉
