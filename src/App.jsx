import { useState, useEffect, useRef, lazy, Suspense } from 'react'
import { collection, onSnapshot, query, orderBy, limit, where, doc, getDoc, setDoc, deleteDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  deleteUser,
} from 'firebase/auth'
import { db, storage, auth, googleProvider } from './firebase'
import Leaderboard from './components/Leaderboard'
import SubmitDrink from './components/SubmitDrink'
import Feed from './components/Feed'
import UserProfile from './components/UserProfile'
import RecapModal from './components/RecapModal'
const MapView = lazy(() => import('./components/MapView'))
import AdminPanel from './components/AdminPanel'
import AgeGate, { isAgeVerified } from './components/AgeGate'
import { PrivacyPolicy, TermsOfService } from './components/LegalPages'
import FriendsModal from './components/FriendsModal'
import DrinkDetail from './components/DrinkDetail'
import NotificationFeed, { getNotifications } from './components/NotificationFeed'
import { getAcceptedFriendUids, getIncomingRequests } from './utils/friends'
import { normalizeUsername, validateUsername, claimUsername, releaseUsername, isUsernameAvailable } from './utils/username'
import { compressImage } from './utils/compressImage'

// ─── Skeleton loaders ────────────────────────────────────────────────────────
function SkeletonBlock({ className = '', style = {} }) {
  return <div className={`animate-pulse rounded-xl ${className}`} style={{ background: 'rgba(255,255,255,0.05)', ...style }} />
}

function AppBootSkeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0C2340 0%, #0a1c36 40%, #0C2340 70%, #091a2e 100%)' }}>
      <div className="max-w-lg mx-auto px-5 pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-4 w-32" />
            <SkeletonBlock className="h-3 w-20" />
          </div>
          <div className="flex gap-2">
            <SkeletonBlock className="h-8 w-8 rounded-full" />
            <SkeletonBlock className="h-8 w-8 rounded-full" />
            <SkeletonBlock className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <SkeletonBlock className="h-20 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <SkeletonBlock className="h-10 w-full" />
        <div className="space-y-2">
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
          <SkeletonBlock className="h-16 w-full" />
        </div>
      </div>
    </div>
  )
}

function MapSkeleton() {
  return <SkeletonBlock className="w-full" style={{ height: '420px', borderRadius: '16px' }} />
}

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local timezone
}

function formatDayLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── Login screen (Google + Email/Password) ───────────────────────────────────
function LoginScreen() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleGoogle() {
    setErr('')
    setBusy(true)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setErr(e.message.replace('Firebase: ', ''))
    }
    setBusy(false)
  }

  async function handleEmail(e) {
    e.preventDefault()
    setErr('')
    setBusy(true)
    try {
      if (mode === 'signin') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
    } catch (e) {
      setErr(e.message.replace('Firebase: ', ''))
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0C2340 0%, #0a1c36 40%, #0C2340 70%, #091a2e 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="text-5xl mb-2">☘️</div>
          <h1 className="text-3xl font-black text-white tracking-tight">SD Weekend Send</h1>
          <p className="text-slate-400 text-sm mt-1.5 font-medium">Go Irish. Send It. ☘️</p>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'rgba(10,18,34,0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)' }}>
          {/* Google Sign In */}
          <button
            onClick={handleGoogle}
            disabled={busy}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-semibold text-slate-900 bg-white hover:bg-slate-100 active:scale-95 transition-all disabled:opacity-50"
          >
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571.001-.001.002-.001.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Continue with Google
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-slate-500 font-semibold">OR</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmail} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {err && <p className="text-red-400 text-xs text-center">{err}</p>}
            <button
              type="submit"
              disabled={busy || !email || !password}
              className="btn-cta w-full py-3 font-bold text-white disabled:opacity-40"
            >
              {busy ? '...' : (mode === 'signin' ? 'Sign In' : 'Create Account')}
            </button>
          </form>

          <button
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setErr('') }}
            className="w-full text-center text-sm text-slate-400 hover:text-white transition-colors"
          >
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <span className="text-amber-400 font-semibold">{mode === 'signin' ? 'Sign up' : 'Sign in'}</span>
          </button>
        </div>

        <div className="flex items-center justify-center gap-4 text-[11px] text-slate-600 mt-5">
          <a href="#privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="#terms" className="hover:text-slate-400 transition-colors">Terms of Service</a>
        </div>
        <p className="text-[10px] text-slate-700 text-center mt-2">21+ only. Please drink responsibly.</p>
      </div>
    </div>
  )
}

// ─── Profile setup modal (name + photo for new users) ────────────────────────
function ProfileSetupModal({ authUser, onDone }) {
  const [name, setName] = useState(authUser.displayName || '')
  const [username, setUsername] = useState('')
  const [photoPreview, setPhotoPreview] = useState(authUser.photoURL || null)
  const [photoData, setPhotoData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [usernameStatus, setUsernameStatus] = useState('') // 'checking' | 'available' | 'taken' | ''
  const fileRef = useRef(null)

  // Debounced username availability check
  useEffect(() => {
    setErr('')
    const u = normalizeUsername(username)
    if (!u) { setUsernameStatus(''); return }
    const validationErr = validateUsername(u)
    if (validationErr) { setUsernameStatus(''); return }
    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const ok = await isUsernameAvailable(u)
        setUsernameStatus(ok ? 'available' : 'taken')
      } catch {
        setUsernameStatus('')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [username])

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImage(file, { maxDimension: 600, quality: 0.85 })
    const reader = new FileReader()
    reader.onload = ev => {
      setPhotoPreview(ev.target.result)
      setPhotoData(ev.target.result)
    }
    reader.readAsDataURL(compressed)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    if (!name.trim()) return

    const normalizedUsername = normalizeUsername(username)
    const usernameErr = validateUsername(normalizedUsername)
    if (usernameErr) {
      setErr(usernameErr)
      return
    }

    setBusy(true)

    // 1. Claim the username first (atomic uniqueness)
    try {
      await claimUsername(normalizedUsername, authUser.uid)
    } catch (e) {
      setErr(e.message)
      setBusy(false)
      return
    }

    // 2. Upload photo
    let profilePhotoUrl = authUser.photoURL || ''
    if (photoData) {
      try {
        const blob = await fetch(photoData).then(r => r.blob())
        const photoRef = ref(storage, `profiles/${authUser.uid}`)
        await uploadBytes(photoRef, blob)
        profilePhotoUrl = await getDownloadURL(photoRef)
      } catch (err) {
        console.error('Profile photo upload failed:', err)
      }
    }

    // 3. Save user profile with username
    const profile = {
      userId: authUser.uid,
      name: name.trim(),
      username: normalizedUsername,
      profilePhoto: profilePhotoUrl,
      email: authUser.email || '',
      ageVerified: true,
      createdAt: Date.now(),
    }
    try {
      await setDoc(doc(db, 'users', authUser.uid), profile)
      onDone(profile)
    } catch (err) {
      console.error('Profile save failed:', err)
      // Rollback username reservation on failure
      await releaseUsername(normalizedUsername)
      setErr('Could not save profile. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">☘️</div>
          <h1 className="text-2xl font-black text-white">Complete Your Profile</h1>
          <p className="text-slate-400 text-sm mt-1">Almost there</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative"
            >
              {photoPreview ? (
                <img src={photoPreview} alt="profile" className="w-20 h-20 rounded-full object-cover border-4 border-amber-500" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-3xl hover:border-amber-500 transition-colors">
                  👤
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs">+</div>
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />
          </div>
          <p className="text-center text-xs text-slate-500">Profile photo (optional)</p>

          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Display name"
            required
            autoFocus
            maxLength={40}
            className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
          />

          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold pointer-events-none">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(normalizeUsername(e.target.value))}
                placeholder="username"
                required
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {usernameStatus === 'checking' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">...</span>
              )}
              {usernameStatus === 'available' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">✓</span>
              )}
              {usernameStatus === 'taken' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">✗ taken</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 ml-1">3-20 chars · letters, numbers, . _</p>
          </div>

          {err && <p className="text-red-400 text-xs text-center">{err}</p>}

          <button
            type="submit"
            disabled={!name.trim() || !username.trim() || usernameStatus === 'taken' || usernameStatus === 'checking' || busy}
            className="btn-cta w-full py-3 font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Saving...' : "Let's Go 🚀"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────
function EditProfileModal({ user, onSave, onClose }) {
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username || '')
  const [photoPreview, setPhotoPreview] = useState(user.profilePhoto)
  const [photoData, setPhotoData] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteErr, setDeleteErr] = useState('')
  const [saveErr, setSaveErr] = useState('')
  const [saving, setSaving] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState('')
  const fileRef = useRef(null)

  // Debounced username availability check (only when changed from original)
  useEffect(() => {
    setSaveErr('')
    const u = normalizeUsername(username)
    if (!u || u === (user.username || '')) { setUsernameStatus(''); return }
    const validationErr = validateUsername(u)
    if (validationErr) { setUsernameStatus(''); return }
    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const ok = await isUsernameAvailable(u)
        setUsernameStatus(ok ? 'available' : 'taken')
      } catch {
        setUsernameStatus('')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [username, user.username])

  async function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImage(file, { maxDimension: 600, quality: 0.85 })
    const reader = new FileReader()
    reader.onload = ev => {
      setPhotoPreview(ev.target.result)
      setPhotoData(ev.target.result)
    }
    reader.readAsDataURL(compressed)
  }

  async function handleSave() {
    setSaveErr('')
    if (!name.trim()) return

    const newUsername = normalizeUsername(username)
    const oldUsername = user.username || ''
    const changedUsername = newUsername !== oldUsername

    if (changedUsername) {
      const err = validateUsername(newUsername)
      if (err) { setSaveErr(err); return }
    }

    setSaving(true)

    // If username changed, claim new one first
    if (changedUsername) {
      try {
        await claimUsername(newUsername, user.userId)
      } catch (e) {
        setSaveErr(e.message)
        setSaving(false)
        return
      }
    }

    let profilePhotoUrl = user.profilePhoto

    if (photoData) {
      try {
        const blob = await fetch(photoData).then(r => r.blob())
        const photoRef = ref(storage, `profiles/${user.userId}`)
        await uploadBytes(photoRef, blob)
        profilePhotoUrl = await getDownloadURL(photoRef)
      } catch (err) {
        console.error('Profile photo upload failed:', err)
      }
    }

    const updated = { ...user, name: name.trim(), username: newUsername, profilePhoto: profilePhotoUrl }
    const nameChanged = updated.name !== user.name
    const photoChanged = updated.profilePhoto !== user.profilePhoto

    try {
      await setDoc(doc(db, 'users', user.userId), updated, { merge: true })

      // Sync name/photo across all existing drink docs
      if (nameChanged || photoChanged) {
        try {
          const drinksSnap = await getDocs(query(collection(db, 'drinks'), where('userId', '==', user.userId)))
          const batch = writeBatch(db)
          drinksSnap.forEach(d => {
            const updates = {}
            if (nameChanged) updates.name = updated.name
            if (photoChanged) updates.profilePhoto = updated.profilePhoto
            batch.update(doc(db, 'drinks', d.id), updates)
          })
          await batch.commit()
        } catch (syncErr) {
          console.warn('Drink profile sync failed (non-critical):', syncErr)
        }
      }

      // Release old username after successful save
      if (changedUsername && oldUsername) {
        await releaseUsername(oldUsername)
      }
      onSave(updated)
    } catch (err) {
      console.error('Profile save failed:', err)
      // Roll back new username claim on failure
      if (changedUsername) {
        await releaseUsername(newUsername)
      }
      setSaveErr('Could not save profile. Try again.')
      setSaving(false)
    }
  }

  async function handleSignOut() {
    await signOut(auth)
    onClose()
  }

  async function handleDeleteAccount() {
    setDeleteErr('')
    setDeleting(true)
    try {
      // 1. Delete all drinks by this user
      const drinksSnap = await getDocs(collection(db, 'drinks'))
      for (const d of drinksSnap.docs) {
        if (d.data().userId === user.userId) {
          await deleteDoc(doc(db, 'drinks', d.id))
        }
      }

      // 2. Delete profile photo from storage (best-effort)
      try {
        await deleteObject(ref(storage, `profiles/${user.userId}`))
      } catch (e) { /* ignore — may not exist */ }

      // 3. Release username reservation
      if (user.username) {
        await releaseUsername(user.username)
      }

      // 4. Delete user profile doc
      await deleteDoc(doc(db, 'users', user.userId))

      // 4. Delete auth account (must be recently signed-in)
      await deleteUser(auth.currentUser)

      // onAuthStateChanged will kick the user back to login
      onClose()
    } catch (err) {
      console.error('Delete account error:', err)
      if (err.code === 'auth/requires-recent-login') {
        setDeleteErr('For security, please sign out and sign back in, then try again.')
      } else {
        setDeleteErr(err.message || 'Could not delete account. Please try again.')
      }
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-black text-white mb-4">Edit Profile</h2>

        <button type="button" onClick={() => fileRef.current?.click()} className="relative mx-auto block mb-4">
          {photoPreview ? (
            <img src={photoPreview} alt="profile" className="w-20 h-20 rounded-full object-cover border-4 border-amber-500" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-3xl hover:border-amber-500 transition-colors">👤</div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs">+</div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Display name"
          maxLength={40}
          className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors mb-3"
        />

        <div className="mb-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold pointer-events-none">@</span>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(normalizeUsername(e.target.value))}
              placeholder="username"
              maxLength={20}
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full bg-slate-800 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {usernameStatus === 'checking' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">...</span>
            )}
            {usernameStatus === 'available' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">✓</span>
            )}
            {usernameStatus === 'taken' && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">✗ taken</span>
            )}
          </div>
        </div>

        {saveErr && <p className="text-red-400 text-xs text-center mb-2">{saveErr}</p>}

        <div className="flex gap-2 mb-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || !username.trim() || usernameStatus === 'taken' || usernameStatus === 'checking' || saving}
            className="flex-1 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-amber-600 to-yellow-600 disabled:opacity-40 active:scale-95 transition-all"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>

        <button onClick={handleSignOut} className="w-full py-2 text-xs text-slate-500 hover:text-white transition-colors">
          Sign Out
        </button>

        <div className="mt-4 pt-4 border-t border-white/5">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="w-full py-2 text-xs text-slate-600 hover:text-red-400 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-red-400 text-center font-semibold">
                This permanently deletes your account, profile, and all drinks. Cannot be undone.
              </p>
              {deleteErr && <p className="text-xs text-red-400 text-center">{deleteErr}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => { setConfirmDelete(false); setDeleteErr('') }}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-all"
                >
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-center gap-4 text-[10px] text-slate-600">
          <a href="#privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</a>
          <span>·</span>
          <a href="#terms" className="hover:text-slate-400 transition-colors">Terms of Service</a>
        </div>
      </div>
    </div>
  )
}

// ─── Username Setup Modal (for existing users missing a username) ────────────
function UsernameSetupModal({ user, onDone }) {
  const [username, setUsername] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState('')

  useEffect(() => {
    setErr('')
    const u = normalizeUsername(username)
    if (!u) { setUsernameStatus(''); return }
    const validationErr = validateUsername(u)
    if (validationErr) { setUsernameStatus(''); return }
    setUsernameStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const ok = await isUsernameAvailable(u)
        setUsernameStatus(ok ? 'available' : 'taken')
      } catch {
        setUsernameStatus('')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [username])

  async function handleSubmit(e) {
    e.preventDefault()
    setErr('')
    const u = normalizeUsername(username)
    const validationErr = validateUsername(u)
    if (validationErr) { setErr(validationErr); return }

    setBusy(true)
    try {
      await claimUsername(u, user.userId)
      const updated = { ...user, username: u }
      await setDoc(doc(db, 'users', user.userId), updated, { merge: true })
      onDone(updated)
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2">✨</div>
          <h1 className="text-2xl font-black text-white">Pick a Username</h1>
          <p className="text-slate-400 text-sm mt-1.5">We added usernames — grab yours before someone else does</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold pointer-events-none">@</span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(normalizeUsername(e.target.value))}
                placeholder="username"
                required
                autoFocus
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
                className="w-full bg-slate-800 border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
              />
              {usernameStatus === 'checking' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">...</span>
              )}
              {usernameStatus === 'available' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-400">✓</span>
              )}
              {usernameStatus === 'taken' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">✗ taken</span>
              )}
            </div>
            <p className="text-[10px] text-slate-500 mt-1 ml-1">3-20 chars · letters, numbers, . _</p>
          </div>

          {err && <p className="text-red-400 text-xs text-center">{err}</p>}

          <button
            type="submit"
            disabled={!username.trim() || usernameStatus === 'taken' || usernameStatus === 'checking' || busy}
            className="btn-cta w-full py-3 font-bold text-white disabled:opacity-40"
          >
            {busy ? 'Saving...' : 'Claim It'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Add-to-Home-Screen prompt ────────────────────────────────────────────────
function InstallPrompt({ deferredPrompt, onDismiss }) {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream

  if (isStandalone) return null

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
    }
    onDismiss()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onDismiss} />
      <div
        className="relative w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{
          background: 'rgba(7,14,28,0.96)',
          backdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -8px 48px rgba(201,151,0,0.12)',
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-6 pt-3 pb-8 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#C99700,#0C2340)', boxShadow: '0 0 28px rgba(201,151,0,0.5)' }}>
              ☘️
            </div>
            <div>
              <h2 className="text-xl font-black leading-tight"
                style={{ background: 'linear-gradient(90deg,#C99700,#0C2340)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Add to Home Screen
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">One tap to open — no App Store needed</p>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              ['⚡', 'Instant access', 'Opens full-screen, no browser chrome'],
              ['🔔', 'Stay in the loop', 'Notifications when someone likes your drink'],
              ['🏆', 'Competition ready', 'Track events right from your home screen'],
            ].map(([icon, title, sub]) => (
              <div key={title} className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{title}</div>
                  <div className="text-xs text-slate-500">{sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl px-4 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs text-slate-400">💡 <span className="text-slate-300">After adding to home screen, open the app from your home screen and sign in there. Use only the home screen app going forward.</span></p>
          </div>

          {isIOS ? (
            <>
              <div className="rounded-2xl px-4 py-4 space-y-3"
                style={{ background: 'rgba(201,151,0,0.08)', border: '1px solid rgba(201,151,0,0.25)' }}>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-widest">How to add on iPhone</p>
                {[
                  ['1', 'Tap the', 'Share', 'button at the bottom'],
                  ['2', 'Scroll down and tap', '"View More"', ''],
                  ['3', 'Tap', '"Add to Home Screen"', 'and confirm — done! 🎉'],
                ].map(([n, pre, bold, post]) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg,#C99700,#0C2340)' }}>{n}</div>
                    <p className="text-sm text-slate-300">
                      {pre}{' '}
                      <span style={{ background: 'linear-gradient(90deg,#C99700,#0C2340)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 800 }}>
                        {bold}
                      </span>
                      {post ? ' ' + post : ''}
                    </p>
                  </div>
                ))}
              </div>
              <button onClick={onDismiss} className="btn-cta w-full py-4 font-bold text-white text-base text-center">
                ✅ &nbsp;Done! I've added it
              </button>
              <button onClick={onDismiss} className="w-full py-2 text-slate-600 text-sm font-medium">
                Skip for now
              </button>
            </>
          ) : deferredPrompt ? (
            <>
              <button onClick={handleInstall} className="btn-cta w-full py-4 font-bold text-white text-base text-center">
                📲 &nbsp;Add to Home Screen
              </button>
              <button onClick={onDismiss} className="w-full py-2 text-slate-600 text-sm font-medium">
                Skip for now
              </button>
            </>
          ) : (
            <>
              <div className="rounded-2xl px-5 py-4 text-center space-y-2"
                style={{ background: 'rgba(201,151,0,0.08)', border: '1px solid rgba(201,151,0,0.25)' }}>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Open your browser menu and tap</p>
                <p className="text-xl font-black"
                  style={{ background: 'linear-gradient(90deg,#C99700,#0C2340)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  "Add to Home Screen"
                </p>
                <p className="text-xs text-slate-500">Then tap <span className="text-slate-300 font-semibold">"Add"</span> to confirm 🎉</p>
              </div>
              <button onClick={onDismiss} className="btn-cta w-full py-4 font-bold text-white text-base text-center">
                ✅ &nbsp;Done! I've added it
              </button>
              <button onClick={onDismiss} className="w-full py-2 text-slate-600 text-sm font-medium">
                Skip for now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Winners bar ──────────────────────────────────────────────────────────────
function Winners({ drinks: rawDrinks }) {
  const drinks = rawDrinks.filter(d => d.userId !== 'ADMIN')

  // Build ranked list
  const map = {}
  drinks.forEach(d => {
    map[d.userId] = map[d.userId] || { name: d.name, points: 0 }
    map[d.userId].points += d.points
  })
  const ranked = Object.values(map).sort((a, b) => b.points - a.points)

  if (ranked.length === 0) return null

  const first = ranked[0]
  const second = ranked[1]
  const third = ranked[2]

  return (
    <div className="space-y-2">
      {/* 1st Place — Gold */}
      <div className="card-hero px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-widest mb-0.5">👑 1st Place</div>
            <div className="text-xl font-black text-white">{first.name}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-3xl font-black text-shimmer-gold">{first.points}</span>
            <div className="text-[10px] text-amber-400/70 text-center font-semibold">pts</div>
          </div>
        </div>
      </div>

      {/* 2nd & 3rd — side by side */}
      <div className="grid grid-cols-2 gap-2">
        {/* 2nd Place — Silver */}
        <div className="card px-4 py-3">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">🥈 2nd Place</div>
          {second ? (
            <>
              <div className="text-base font-bold text-white truncate">{second.name}</div>
              <div className="text-sm text-slate-300 font-semibold mt-0.5">{second.points} pts</div>
            </>
          ) : (
            <div className="text-sm text-slate-600 py-1">—</div>
          )}
        </div>

        {/* 3rd Place — Bronze */}
        <div className="card px-4 py-3">
          <div className="text-[11px] font-semibold text-amber-700/80 uppercase tracking-wider mb-1">🥉 3rd Place</div>
          {third ? (
            <>
              <div className="text-base font-bold text-white truncate">{third.name}</div>
              <div className="text-sm text-amber-700/80 font-semibold mt-0.5">{third.points} pts</div>
            </>
          ) : (
            <div className="text-sm text-slate-600 py-1">—</div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)
  const [ageVerified, setAgeVerified] = useState(() => isAgeVerified())
  const [authUser, setAuthUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [user, setUser] = useState(null) // Firestore profile doc
  const [profileLoading, setProfileLoading] = useState(false)
  const [drinks, setDrinks] = useState([])
  const [activeEvent, setActiveEvent] = useState(null)

  // Hash-based routing for legal pages
  useEffect(() => {
    const handler = () => setHash(window.location.hash)
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  const [selectedFilter, setSelectedFilter] = useState('today')
  const [scope, setScope] = useState('global') // forced global for this version
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [selectedProfile, setSelectedProfile] = useState(null) // full user doc
  const [showRecap, setShowRecap] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedDrink, setSelectedDrink] = useState(null)
  const [allUsers, setAllUsers] = useState([])
  const [friendships, setFriendships] = useState([])
  const [toast, setToast] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const submitRef = useRef(null)
  const prevLikesRef = useRef({})
  const userRef = useRef(null)

  useEffect(() => {
    let manifest = document.querySelector('link[rel="manifest"]')
    if (!manifest) {
      manifest = document.createElement('link')
      manifest.rel = 'manifest'
      manifest.href = '/manifest.json'
      document.head.appendChild(manifest)
    }
  }, [])

  useEffect(() => {
    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Listen to auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setAuthUser(fbUser)
      setAuthLoading(false)
      if (fbUser) {
        // Load or create Firestore profile doc
        setProfileLoading(true)
        try {
          const snap = await getDoc(doc(db, 'users', fbUser.uid))
          if (snap.exists()) {
            setUser(snap.data())
          } else {
            setUser(null) // Triggers profile setup modal
          }
        } catch (err) {
          console.error('Profile load failed:', err)
        }
        setProfileLoading(false)
      } else {
        setUser(null)
      }
    })
    return unsub
  }, [])

  // Load active event from Firestore
  useEffect(() => {
    if (!authUser) return
    const q = query(collection(db, 'events'), where('active', '==', true), limit(1))
    const unsub = onSnapshot(q, snap => {
      if (snap.docs.length > 0) {
        setActiveEvent({ id: snap.docs[0].id, ...snap.docs[0].data() })
      } else {
        setActiveEvent(null)
      }
    })
    return unsub
  }, [authUser])

  // Real-time drinks listener + like notifications
  useEffect(() => {
    if (!authUser) return
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const q = query(collection(db, 'drinks'), orderBy('createdAt', 'desc'), limit(200))
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setDrinks(data)

      const currentUser = userRef.current
      if (currentUser && Notification.permission === 'granted') {
        data.forEach(drink => {
          if (drink.userId !== currentUser.userId) return
          const prevLikes = prevLikesRef.current[drink.id] || []
          const newLikes = drink.likes || []
          const added = newLikes.filter(uid => !prevLikes.includes(uid) && uid !== currentUser.userId)
          if (added.length > 0) {
            const likerName = data.find(d => d.userId === added[0])?.name || 'Someone'
            new Notification('New like! ❤️', {
              body: `${likerName} liked your drink`,
              icon: '/favicon.ico',
            })
          }
        })
      }

      const newSnapshot = {}
      data.forEach(d => { newSnapshot[d.id] = d.likes || [] })
      prevLikesRef.current = newSnapshot
    }, err => {
      console.error('Firestore error:', err)
    })
    return unsub
  }, [authUser])

  useEffect(() => { userRef.current = user }, [user])

  // Listen to all users (for search, name resolution)
  useEffect(() => {
    if (!authUser) return
    const unsub = onSnapshot(collection(db, 'users'), snap => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, err => console.error('Users listener error:', err))
    return unsub
  }, [authUser])

  // Listen to friendships involving current user
  useEffect(() => {
    if (!authUser) return
    const q = query(collection(db, 'friendships'), where('users', 'array-contains', authUser.uid))
    const unsub = onSnapshot(q, snap => {
      setFriendships(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, err => console.error('Friendships listener error:', err))
    return unsub
  }, [authUser])

  // Legal pages (hash routing) — accessible without auth
  if (hash === '#privacy') return <PrivacyPolicy />
  if (hash === '#terms') return <TermsOfService />

  // Admin panel — access via ?admin in URL
  const isAdmin = new URLSearchParams(window.location.search).has('admin')
  if (isAdmin) {
    return <AdminPanel drinks={drinks} activeEvent={activeEvent} />
  }

  // Auth loading
  if (authLoading) {
    return <AppBootSkeleton />
  }

  // Not signed in
  if (!authUser) {
    return <LoginScreen />
  }

  // Signed in but no profile yet
  if (!user && !profileLoading) {
    return (
      <ProfileSetupModal
        authUser={authUser}
        onDone={newUser => {
          setUser(newUser)
          if (!localStorage.getItem('st_install_shown')) {
            setTimeout(() => setShowInstall(true), 600)
          }
        }}
      />
    )
  }

  if (profileLoading || !user) {
    return <AppBootSkeleton />
  }

  // Age gate — after sign-up/sign-in, before entering the app
  // Check both Firestore (persistent) and localStorage (fast). If either says verified, skip.
  // If localStorage says verified but Firestore doesn't, sync it up.
  const alreadyVerified = user.ageVerified || ageVerified
  if (!alreadyVerified) {
    return <AgeGate onVerified={async () => {
      setAgeVerified(true)
      try {
        await setDoc(doc(db, 'users', user.userId), { ageVerified: true }, { merge: true })
        setUser(prev => ({ ...prev, ageVerified: true }))
      } catch (e) {
        console.error('Failed to save age verification:', e)
      }
    }} />
  }
  // If localStorage verified but Firestore not yet synced, save it now (fire-and-forget)
  if (ageVerified && !user.ageVerified) {
    setDoc(doc(db, 'users', user.userId), { ageVerified: true }, { merge: true })
      .then(() => setUser(prev => ({ ...prev, ageVerified: true })))
      .catch(() => {})
  }

  // Existing users without a username — prompt them to pick one
  if (!user.username) {
    return <UsernameSetupModal user={user} onDone={(updated) => setUser(updated)} />
  }

  // If an event is active, filter to that event's drinks; otherwise show all drinks
  let eventDrinks = activeEvent
    ? drinks.filter(d => d.eventId === activeEvent.id)
    : drinks.filter(d => d.userId !== 'ADMIN')

  // Apply friends scope filter: only self + accepted friends
  const friendUids = getAcceptedFriendUids(user.userId, friendships)
  const hasFriends = friendUids.length > 0
  const effectiveScope = hasFriends ? scope : 'global'
  if (effectiveScope === 'friends') {
    const allowed = new Set([user.userId, ...friendUids])
    eventDrinks = eventDrinks.filter(d => allowed.has(d.userId))
  }

  const pendingRequestCount = getIncomingRequests(user.userId, friendships).length
  const notifications = getNotifications(user.userId, drinks, allUsers)
  const notifCount = notifications.length

  return (
    <>
    <div
      className="ambient-bg min-h-screen pb-36"
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #0C2340 0%, #0a1c36 40%, #0C2340 70%, #091a2e 100%)',
      }}
    >
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.12)',
      }} />

      <div className="glow-blob glow-blob-blue" />

      <header className="sticky top-0 z-40 border-b border-white/[0.08]" style={{ background: 'rgba(3,7,18,0.94)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-black text-white leading-none tracking-tight">☘️ SD Weekend Send</h1>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Hey, {user.name}!
              {(() => {
                const pts = eventDrinks.filter(d => d.userId === user.userId).reduce((sum, d) => sum + (d.points || 0), 0)
                return pts > 0 ? <span className="ml-1.5 text-amber-400 font-bold">⚡ {pts} pts</span> : null
              })()}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFriends(true)}
              aria-label="Friends"
              className="relative text-[12px] font-semibold text-white px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              👥
              {pendingRequestCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{pendingRequestCount}</span>
              )}
            </button>
            <button
              onClick={() => setShowNotifications(true)}
              aria-label="Notifications"
              className="relative text-[12px] font-semibold text-white px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              🔔
              {notifCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{notifCount > 9 ? '9+' : notifCount}</span>
              )}
            </button>
            <button
              onClick={() => setShowRecap(true)}
              aria-label="View recap stats"
              className="text-[12px] font-semibold text-white px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,rgba(201,151,0,0.25),rgba(12,35,64,0.25))', border: '1px solid rgba(201,151,0,0.3)' }}
            >
              📊
            </button>
            <button
              onClick={() => setShowEditProfile(true)}
              aria-label="Edit profile"
              className="text-[12px] font-semibold text-white px-3 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              ✏️
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto pt-5 pb-4 space-y-5" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>

        {activeEvent && (
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">🎯</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{activeEvent.name}</div>
              <div className="text-xs text-slate-400">
                {activeEvent.startDate?.toDate ? formatDayLabel(activeEvent.startDate.toDate().toLocaleDateString('en-CA')) : ''} — {activeEvent.endDate?.toDate ? formatDayLabel(activeEvent.endDate.toDate().toLocaleDateString('en-CA')) : ''}
              </div>
            </div>
          </div>
        )}

        <Winners drinks={eventDrinks} />

        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl" style={{ background: 'rgba(10,18,34,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {['today', 'all'].map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`py-2.5 text-sm font-semibold transition-all duration-200 ${
                selectedFilter === filter ? 'seg-active' : 'seg-inactive'
              }`}
            >
              {filter === 'today' ? '📅 Today' : (activeEvent ? '🏆 Full Event' : '🏆 All Time')}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl" style={{ background: 'rgba(10,18,34,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {[['leaderboard','🏆','Board'], ['feed','📸','Feed'], ['map','🗺️','Map']].map(([tab, icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 text-sm font-semibold transition-all duration-200 ${
                activeTab === tab ? 'seg-active' : 'seg-inactive'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        {activeTab === 'leaderboard' && (
          <Leaderboard drinks={eventDrinks} selectedFilter={selectedFilter} onUserClick={(uid) => {
            const profile = allUsers.find(u => u.userId === uid)
            if (profile) setSelectedProfile(profile)
          }} />
        )}
        {activeTab === 'feed' && (
          <Feed drinks={eventDrinks} user={user} onDrinkClick={setSelectedDrink} />
        )}
        {activeTab === 'map' && (
          <Suspense fallback={<MapSkeleton />}>
            <MapView drinks={eventDrinks} />
          </Suspense>
        )}
      </div>

      <div
        ref={submitRef}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.05]"
        style={{ background: 'rgba(5,10,22,0.96)', backdropFilter: 'blur(24px)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3">
          <details className="group" id="drink-form">
            <summary className="list-none cursor-pointer">
              <div className="btn-cta w-full py-4 font-bold text-white text-base text-center select-none summary-open-hide">
                ☘️ &nbsp;Log a Drink
              </div>
              <div className="summary-open-show items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold text-slate-300" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}>
                ✕ Close
              </div>
            </summary>
            <div className="mt-4 pb-2">
              <SubmitDrink user={user} activeEvent={activeEvent} onSuccess={() => {
                const el = document.getElementById('drink-form')
                if (el) el.removeAttribute('open')
                setToast('🎉 Drink logged!')
                setTimeout(() => setToast(''), 3000)
              }} />
            </div>
          </details>
        </div>
      </div>
    </div>

    {showInstall && (
      <InstallPrompt
        deferredPrompt={deferredPrompt}
        onDismiss={() => {
          setShowInstall(false)
          localStorage.setItem('st_install_shown', '1')
        }}
      />
    )}

    {showRecap && (
      <RecapModal filter={selectedFilter} drinks={eventDrinks} onClose={() => setShowRecap(false)} />
    )}

    {selectedProfile && (
      <UserProfile
        profile={selectedProfile}
        currentUser={user}
        drinks={drinks}
        friendships={friendships}
        onClose={() => setSelectedProfile(null)}
      />
    )}

    {showFriends && (
      <FriendsModal
        currentUser={user}
        allUsers={allUsers}
        friendships={friendships}
        onClose={() => setShowFriends(false)}
        onOpenProfile={(profile) => {
          setShowFriends(false)
          setSelectedProfile(profile)
        }}
      />
    )}

    {showEditProfile && (
      <EditProfileModal
        user={user}
        onSave={(updated) => { setUser(updated); setShowEditProfile(false); }}
        onClose={() => setShowEditProfile(false)}
      />
    )}

    {selectedDrink && (
      <DrinkDetail
        drink={selectedDrink}
        user={user}
        onClose={() => setSelectedDrink(null)}
      />
    )}

    {showNotifications && (
      <NotificationFeed
        notifications={notifications}
        onClose={() => setShowNotifications(false)}
        onOpenDrink={(drink) => {
          setShowNotifications(false)
          setSelectedDrink(drink)
        }}
      />
    )}

    {toast && (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-xl animate-bounce"
        style={{ background: 'linear-gradient(135deg,#C99700,#0C2340)', boxShadow: '0 8px 32px rgba(201,151,0,0.4)' }}>
        {toast}
      </div>
    )}
    </>
  )
}
