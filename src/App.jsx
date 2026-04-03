import { useState, useEffect, useRef, useCallback } from 'react'
import { DEMO_DRINKS } from './demoData'
import { collection, onSnapshot, query, orderBy, limit, where, getDocs } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'
import Leaderboard from './components/Leaderboard'
import SubmitDrink from './components/SubmitDrink'
import Feed from './components/Feed'
import UserProfile from './components/UserProfile'
import RecapModal from './components/RecapModal'
import MapView from './components/MapView'
import AdminPanel from './components/AdminPanel'

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD in local timezone
}

function formatDayLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

// ─── User identity stored in localStorage ────────────────────────────────────
function loadUser() {
  try {
    const raw = localStorage.getItem('mst_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveUser(user) {
  localStorage.setItem('mst_user', JSON.stringify(user))
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// ─── Onboarding modal ─────────────────────────────────────────────────────────
function OnboardingModal({ onDone }) {
  const [name, setName] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoData, setPhotoData] = useState(null)
  const fileRef = useRef(null)

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPhotoPreview(ev.target.result)
      setPhotoData(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    const userId = generateId()
    let profilePhotoUrl = ''

    // Upload profile photo to Storage (not base64)
    if (photoData) {
      try {
        const blob = await fetch(photoData).then(r => r.blob())
        const photoRef = ref(storage, `profiles/${userId}`)
        await uploadBytes(photoRef, blob)
        profilePhotoUrl = await getDownloadURL(photoRef)
      } catch (err) {
        console.error('Profile photo upload failed:', err)
      }
    }

    const user = {
      userId,
      name: name.trim(),
      profilePhoto: profilePhotoUrl,
    }
    saveUser(user)
    onDone(user)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🍹</div>
          <h1 className="text-2xl font-black text-white">Send Tracker</h1>
          <p className="text-slate-400 text-sm mt-1">Track. Compete. Send It.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar picker */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative"
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="profile"
                  className="w-20 h-20 rounded-full object-cover border-4 border-pink-500"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-700 border-4 border-slate-600 flex items-center justify-center text-3xl hover:border-pink-500 transition-colors">
                  👤
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-pink-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs">
                +
              </div>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>
          <p className="text-center text-xs text-slate-500">Profile photo (optional)</p>

          {/* Name */}
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Your name"
            required
            autoFocus
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
          />

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 transition-all shadow-lg shadow-pink-600/30"
          >
            Let's Go 🎉
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────
function EditProfileModal({ user, onSave, onClose }) {
  const [name, setName] = useState(user.name)
  const [photoPreview, setPhotoPreview] = useState(user.profilePhoto)
  const [photoData, setPhotoData] = useState(null)
  const fileRef = useRef(null)

  function handlePhoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setPhotoPreview(ev.target.result)
      setPhotoData(ev.target.result)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!name.trim()) return
    let profilePhotoUrl = user.profilePhoto

    // Upload new photo to Storage if changed
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

    const updated = { ...user, name: name.trim(), profilePhoto: profilePhotoUrl }
    onSave(updated)
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-black text-white mb-4">Edit Profile</h2>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative mx-auto block mb-4"
        >
          {photoPreview ? (
            <img src={photoPreview} alt="profile" className="w-20 h-20 rounded-full object-cover border-4 border-pink-500" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-700 border-4 border-slate-600 flex items-center justify-center text-3xl hover:border-pink-500 transition-colors">👤</div>
          )}
          <div className="absolute -bottom-1 -right-1 bg-pink-600 rounded-full w-6 h-6 flex items-center justify-center text-white text-xs">+</div>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} className="hidden" />

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your name"
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors mb-4"
        />

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-xl font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-600 disabled:opacity-40 active:scale-95 transition-all"
          >
            Save
          </button>
        </div>
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
          background: 'rgba(7,16,31,0.96)',
          backdropFilter: 'blur(32px)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 -8px 48px rgba(244,63,94,0.12)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }} />
        </div>

        <div className="px-6 pt-3 pb-8 space-y-5">
          {/* Icon + headline */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#f43f5e,#a855f7)', boxShadow: '0 0 28px rgba(244,63,94,0.5)' }}>
              🍹
            </div>
            <div>
              {/* Pink-gradient headline — makes the action unmissable */}
              <h2 className="text-xl font-black leading-tight"
                style={{ background: 'linear-gradient(90deg,#f43f5e,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                Add to Home Screen
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">One tap to open — no App Store needed</p>
            </div>
          </div>

          {/* Benefits */}
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

          {/* Important note */}
          <div className="rounded-2xl px-4 py-3 text-center"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs text-slate-400">💡 <span className="text-slate-300">After adding to home screen, open the app from your home screen and create your account there. Use only the home screen app going forward.</span></p>
          </div>

          {/* Steps or install button */}
          {isIOS ? (
            <>
              <div className="rounded-2xl px-4 py-4 space-y-3"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
                <p className="text-xs font-bold text-pink-400 uppercase tracking-widest">How to add on iPhone</p>
                {[
                  ['1', 'Tap the', 'Share', 'button at the bottom'],
                  ['2', 'Scroll down and tap', '"View More"', ''],
                  ['3', 'Tap', '"Add to Home Screen"', 'and confirm — done! 🎉'],
                ].map(([n, pre, bold, post]) => (
                  <div key={n} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg,#f43f5e,#a855f7)' }}>{n}</div>
                    <p className="text-sm text-slate-300">
                      {pre}{' '}
                      <span style={{ background: 'linear-gradient(90deg,#f43f5e,#c026d3)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', fontWeight: 800 }}>
                        {bold}
                      </span>
                      {post ? ' ' + post : ''}
                    </p>
                  </div>
                ))}
              </div>
              {/* Primary confirm — opens the app after adding */}
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
              {/* Fallback: show the instruction prominently */}
              <div className="rounded-2xl px-5 py-4 text-center space-y-2"
                style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)' }}>
                <p className="text-xs text-slate-400 uppercase tracking-widest font-semibold">Open your browser menu and tap</p>
                <p className="text-xl font-black"
                  style={{ background: 'linear-gradient(90deg,#f43f5e,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
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
function Winners({ drinks: rawDrinks, activeEvent }) {
  const drinks = rawDrinks.filter(d => d.userId !== 'ADMIN')

  function topForDay(dayStr) {
    const dayDrinks = drinks.filter(d => d.day === dayStr)
    const map = {}
    dayDrinks.forEach(d => {
      map[d.userId] = map[d.userId] || { name: d.name, points: 0 }
      map[d.userId].points += d.points
    })
    const sorted = Object.values(map).sort((a, b) => b.points - a.points)
    return sorted[0] || null
  }

  function overallChamp() {
    const map = {}
    drinks.forEach(d => {
      map[d.userId] = map[d.userId] || { name: d.name, points: 0 }
      map[d.userId].points += d.points
    })
    const sorted = Object.values(map).sort((a, b) => b.points - a.points)
    return sorted[0] || null
  }

  const champ = overallChamp()
  if (!champ) return null

  // Get unique event days from drinks, sorted chronologically
  const eventDays = [...new Set(drinks.map(d => d.day))].sort()
  const todayStr = getTodayStr()

  return (
    <div className="space-y-3">
      {/* Hero — Current Overall Leader */}
      <div className="card-hero px-5 py-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-[11px] font-semibold text-amber-400/80 uppercase tracking-widest mb-0.5">
              {activeEvent ? activeEvent.name + ' Leader' : 'Overall Leader'}
            </div>
            <div className="text-xl font-black text-white">{champ.name}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-3xl font-black text-shimmer-gold">{champ.points}</span>
            <div>
              <span className="text-2xl">👑</span>
              <div className="text-[10px] text-amber-400/70 text-center font-semibold">pts</div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily winner cards — scrollable row */}
      {eventDays.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
          {eventDays.map(dayStr => {
            const winner = topForDay(dayStr)
            const isFuture = dayStr > todayStr
            const dayDate = new Date(dayStr + 'T12:00:00')
            const label = dayDate.toLocaleDateString('en-US', { weekday: 'short' })
            return (
              <div key={dayStr} className={`${isFuture ? 'card-tbd' : 'card'} px-3 py-3 text-center flex-shrink-0`} style={{ minWidth: '100px' }}>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label} 🏆</div>
                {isFuture ? (
                  <div className="py-0.5">
                    <div className="text-xl mb-0.5">👀</div>
                    <div className="text-sm text-slate-600 font-semibold tracking-wide">TBD</div>
                  </div>
                ) : winner ? (
                  <>
                    <div className="text-base font-bold text-white truncate leading-tight">{winner.name}</div>
                    <div className="text-sm text-rose-400 font-semibold mt-0.5">{winner.points} pts</div>
                  </>
                ) : (
                  <div className="text-sm text-slate-700 py-1">—</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true'
  const [user, setUser] = useState(loadUser)
  const [drinks, setDrinks] = useState(DEMO_MODE ? DEMO_DRINKS : [])
  const [activeEvent, setActiveEvent] = useState(null)
  const [selectedFilter, setSelectedFilter] = useState('today')
  const [activeTab, setActiveTab] = useState('leaderboard')
  const [selectedUser, setSelectedUser] = useState(null)
  const [showRecap, setShowRecap] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [toast, setToast] = useState('')
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const submitRef = useRef(null)
  const prevLikesRef = useRef({})
  const userRef = useRef(null)

  // Set document meta tags for mobile
  useEffect(() => {
    // Ensure manifest link exists
    let manifest = document.querySelector('link[rel="manifest"]')
    if (!manifest) {
      manifest = document.createElement('link')
      manifest.rel = 'manifest'
      manifest.href = '/manifest.json'
      document.head.appendChild(manifest)
    }
  }, [])

  // Capture the native install prompt (Android/Chrome)
  useEffect(() => {
    function handler(e) {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // Load active event from Firestore
  useEffect(() => {
    const q = query(collection(db, 'events'), where('active', '==', true), limit(1))
    const unsub = onSnapshot(q, snap => {
      if (snap.docs.length > 0) {
        setActiveEvent({ id: snap.docs[0].id, ...snap.docs[0].data() })
      } else {
        setActiveEvent(null)
      }
    })
    return unsub
  }, [])

  // Real-time Firestore listener + like notifications
  useEffect(() => {
    // Request notification permission early
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    const q = query(collection(db, 'drinks'), orderBy('createdAt', 'desc'), limit(200))
    const unsub = onSnapshot(q, snap => {
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setDrinks(data.length > 0 ? data : (DEMO_MODE ? DEMO_DRINKS : []))

      // Like notifications
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

      // Update previous likes snapshot
      const newSnapshot = {}
      data.forEach(d => { newSnapshot[d.id] = d.likes || [] })
      prevLikesRef.current = newSnapshot
    }, err => {
      console.error('Firestore error:', err)
    })
    return unsub
  }, [])

  // Keep userRef in sync for notification closure
  useEffect(() => { userRef.current = user }, [user])

  // Filter drinks to active event
  const eventDrinks = activeEvent
    ? drinks.filter(d => d.eventId === activeEvent.id)
    : drinks

  // Admin panel — access via ?admin in URL
  const isAdmin = new URLSearchParams(window.location.search).has('admin')
  if (isAdmin) {
    return <AdminPanel drinks={drinks} activeEvent={activeEvent} />
  }

  if (!user) {
    return (
      <OnboardingModal onDone={newUser => {
        setUser(newUser)
        // Show install prompt once after first onboarding
        if (!localStorage.getItem('mst_install_shown')) {
          setTimeout(() => setShowInstall(true), 600)
        }
      }} />
    )
  }

  const todayStr = getTodayStr()

  return (
    <>
    <div
      className="ambient-bg min-h-screen pb-36"
      style={{
        position: 'relative',
        background: 'linear-gradient(135deg, #06111a 0%, #0a1628 40%, #111827 70%, #06111a 100%)',
      }}
    >
      {/* ── Dark overlay for readability ── */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        background: 'rgba(0,0,0,0.12)',
      }} />

      {/* Accent glow blob drifting through center */}
      <div className="glow-blob glow-blob-blue" />
      {/* ── Header (with safe area support for notched phones) ── */}
      <header className="sticky top-0 z-40 border-b border-white/[0.10]" style={{ background: 'rgba(4,8,16,0.94)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', paddingTop: 'max(0px, env(safe-area-inset-top))' }}>
        <div className="max-w-lg mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="text-[17px] font-black text-white leading-none tracking-tight">🍹 Send Tracker</h1>
            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
              Hey, {user.name}!
              {(() => {
                const pts = eventDrinks.filter(d => d.userId === user.userId).reduce((sum, d) => sum + (d.points || 0), 0)
                return pts > 0 ? <span className="ml-1.5 text-pink-400 font-bold">⚡ {pts} pts</span> : null
              })()}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRecap(true)}
              aria-label="View recap stats"
              className="text-[12px] font-semibold text-white px-3.5 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'linear-gradient(135deg,rgba(244,63,94,0.25),rgba(168,85,247,0.25))', border: '1px solid rgba(244,63,94,0.3)' }}
            >
              📊 Recap
            </button>
            <button
              onClick={() => setShowEditProfile(true)}
              aria-label="Edit profile"
              className="text-[12px] font-semibold text-white px-3.5 py-1.5 rounded-full transition-all active:scale-95"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              ✏️ Edit
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto pt-5 pb-4 space-y-5" style={{ paddingLeft: 'max(16px, env(safe-area-inset-left))', paddingRight: 'max(16px, env(safe-area-inset-right))' }}>

        {/* ── Event banner ── */}
        {activeEvent && (
          <div className="card px-4 py-2.5 flex items-center gap-2">
            <span className="text-lg">🎉</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-white truncate">{activeEvent.name}</div>
              <div className="text-xs text-slate-400">
                {activeEvent.startDate?.toDate ? formatDayLabel(activeEvent.startDate.toDate().toLocaleDateString('en-CA')) : ''} — {activeEvent.endDate?.toDate ? formatDayLabel(activeEvent.endDate.toDate().toLocaleDateString('en-CA')) : ''}
              </div>
            </div>
          </div>
        )}

        {!activeEvent && (
          <div className="card px-4 py-3 text-center">
            <p className="text-sm text-slate-400">No active event. Ask an admin to create one!</p>
          </div>
        )}

        {/* ── Winners ── */}
        <Winners drinks={eventDrinks} activeEvent={activeEvent} />

        {/* ── Day toggle ── */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
          {['today', 'event'].map(filter => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`py-2.5 text-sm font-semibold transition-all duration-200 ${
                selectedFilter === filter ? 'seg-active' : 'seg-inactive'
              }`}
            >
              {filter === 'today' ? '📅 Today' : '🏆 Full Event'}
            </button>
          ))}
        </div>

        {/* ── Tab nav ── */}
        <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl" style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
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

        {/* ── Content ── */}
        {activeTab === 'leaderboard' && (
          <Leaderboard drinks={eventDrinks} selectedFilter={selectedFilter} onUserClick={setSelectedUser} />
        )}
        {activeTab === 'feed' && (
          <Feed drinks={eventDrinks} user={user} />
        )}
        {activeTab === 'map' && (
          <MapView drinks={eventDrinks} />
        )}
      </div>

      {/* ── Sticky submit bar (with safe area support for notched phones) ── */}
      <div
        ref={submitRef}
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/[0.05]"
        style={{ background: 'rgba(7,16,31,0.96)', backdropFilter: 'blur(24px)', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto px-4 py-3">
          <details className="group" id="drink-form">
            <summary className="list-none cursor-pointer">
              <div className="btn-cta w-full py-4 font-bold text-white text-base text-center select-none">
                🍹 &nbsp;Log a Drink
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

    {/* ── Modals rendered OUTSIDE the filtered div so z-index works ── */}
    {showInstall && (
      <InstallPrompt
        deferredPrompt={deferredPrompt}
        onDismiss={() => {
          setShowInstall(false)
          localStorage.setItem('mst_install_shown', '1')
        }}
      />
    )}

    {showRecap && (
      <RecapModal filter={selectedFilter} drinks={eventDrinks} onClose={() => setShowRecap(false)} />
    )}

    {selectedUser && (
      <UserProfile
        userId={selectedUser}
        drinks={eventDrinks}
        onClose={() => setSelectedUser(null)}
      />
    )}

    {showEditProfile && (
      <EditProfileModal user={user} onSave={(updated) => { saveUser(updated); setUser(updated); setShowEditProfile(false); }} onClose={() => setShowEditProfile(false)} />
    )}

    {toast && (
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl text-white font-bold text-sm shadow-xl animate-bounce"
        style={{ background: 'linear-gradient(135deg,#f43f5e,#a855f7)', boxShadow: '0 8px 32px rgba(244,63,94,0.4)' }}>
        {toast}
      </div>
    )}
    </>
  )
}
