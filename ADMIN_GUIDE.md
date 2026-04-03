# 🛠️ Admin Guide — Managing Maui Send Tracker

## Firebase Console Access

**Project:** https://console.firebase.google.com/project/maui-send-tracker

### What You Can Monitor

#### 📊 Firestore Database
- All drink logs with timestamps, photos, locations
- User data (names, profile photos, IDs)
- Likes and comments

#### 🖼️ Storage
- All uploaded drink photos
- Organized in `/drinks/` folder

#### 🔥 Real-Time Sync
- All changes sync to users instantly
- ~2-3 second latency from app to database

---

## Common Admin Tasks

### View All Drinks
1. Firebase Console → **Firestore Database**
2. Click `drinks` collection
3. Sort by `createdAt` to see newest first

### View User Profiles
- Look at any drink document
- See `userId`, `name`, `profilePhoto` fields
- No separate "users" collection (stored with each drink)

### Check Storage Space
1. Firebase Console → **Storage**
2. See total used space (photos only)

### Monitor Security
1. Firebase Console → **Firestore** → **Rules**
2. Security rules in `firestore.rules` prevent:
   - Deleting drinks (immutable records)
   - Editing other users' drinks
   - Public writes (only creates allowed)

---

## Troubleshooting

### Issue: No drinks appearing?
**Check:**
- Firestore is reading correctly (try manual query)
- Network request to Firebase succeeds (check browser Network tab)
- Security rules allow `read: if true` ✓

### Issue: Photos not uploading?
**Check:**
- Storage rules allow image uploads ✓
- File is under 10MB
- Content-type is image/*
- Firebase Storage has available space

### Issue: Drinks duplicate?
- Firebase's `onSnapshot` should prevent duplicates via `id`
- If seeing duplicates, check browser console for errors
- Hard refresh (Ctrl+Shift+R) to clear cache

---

## Scaling Considerations

### Current Limits (Production-Ready)
- **Firestore reads:** 50k/day free tier
- **Storage:** 5GB free tier
- **Users:** No hard limit, but ~100 concurrent OK for free tier

### If Growing Beyond Friends

If this gets popular, you might want to:
1. **Upgrade Firebase plan** → pay-as-you-go
2. **Add authentication** → prevent spam
3. **Implement moderation** → remove inappropriate photos
4. **Add data export** → historical reports
5. **Set up analytics** → track usage patterns

---

## Backup & Recovery

### Backup Drinks Data
```bash
# Export Firestore data (manual via Console)
1. Firebase Console → Firestore → ⋮ (menu)
2. "Export collections" → download as JSON
```

### Restore if Needed
```bash
1. Firebase Console → Firestore → ⋮ (menu)
2. "Import collections" → select JSON file
```

### Firebase Automatic Backups
- Firebase automatically keeps 7-day backups
- Access via: Firestore → Backups (backup page)

---

## Modifying the App

### Turn Demo Mode On/Off
**File:** `.env`
```
VITE_DEMO_MODE=true   # Use demo data
VITE_DEMO_MODE=false  # Use real Firebase data
```

### Change Event Days
**File:** `src/App.jsx` (lines 18–22) + `src/utils/badges.js` (line 34)

### Add New Badge Types
**File:** `src/utils/badges.js` → `BADGE_DEFS` array

### Adjust Point Values
**File:** `firestore.rules` (line 20)
```
points in [1, 2, 3]  // Allow 1, 2, or 3 points per drink
```

### Change Colors/Theme
**File:** `src/index.css` → Global CSS
**Or:** Modify Tailwind classes in component files

---

## Security Checklist

- [x] `.env` file never committed to git
- [x] Firebase credentials only in `.env`
- [x] Firestore rules prevent deletion
- [x] Firestore rules validate data types
- [x] Storage rules limit file size (10MB)
- [x] Storage rules limit file type (images only)
- [x] No hardcoded secrets in source code
- [x] HTTPS enforced (Firebase Hosting auto)
- [x] CORS handled by Firebase (auto)
- [x] XSS prevention in custom HTML (profile markers)

---

## Performance Tips

### Database Optimization
- Firestore query already limited to 200 drinks (`.limit(200)`)
- Index created automatically for `orderBy('createdAt', 'desc')`

### Storage Optimization
- Photos compressed client-side before upload (WebP, JPEG)
- Consider resizing large images to 1080px width

### App Performance
- Code splitting enabled (Vite)
- CSS inlined (Tailwind)
- Images lazy-loaded where possible

---

## Monitoring & Alerts

### Set Up Alerts (Optional)
1. Firebase Console → **Notifications**
2. Enable email alerts for:
   - Storage quota exceeded
   - Quota exceeded errors
   - Billing threshold

---

## Disaster Recovery Plan

**If something breaks:**
1. Check Firebase status: https://status.firebase.google.com
2. Check browser console for errors: `Right-click → Inspect → Console`
3. Verify Firestore & Storage rules are deployed
4. Try clearing app cache: `Settings → Apps → Maui Send Tracker → Clear Data`
5. Restart Firebase emulator (if local testing)

**Contact Firebase Support:**
- Free tier: Community forums
- Paid tier: Priority support available

---

## Questions?

- **Firebase docs:** https://firebase.google.com/docs
- **Firestore rules guide:** https://firebase.google.com/docs/firestore/security/start
- **Storage rules guide:** https://firebase.google.com/docs/storage/security/start
