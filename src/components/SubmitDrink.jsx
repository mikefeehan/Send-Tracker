import { useState, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage, auth } from '../firebase'
import { compressImage } from '../utils/compressImage'

// Rate limiting — track submission timestamps in localStorage
function getSubmitHistory() {
  try {
    return JSON.parse(localStorage.getItem('submitHistory') || '[]')
  } catch { return [] }
}
function addSubmitTimestamp() {
  const hist = getSubmitHistory()
  hist.push(Date.now())
  // Keep only last hour of history
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  localStorage.setItem('submitHistory', JSON.stringify(hist.filter(t => t > oneHourAgo)))
}
function checkRateLimit() {
  const hist = getSubmitHistory()
  const now = Date.now()
  const twoMinAgo = now - 2 * 60 * 1000
  const oneHourAgo = now - 60 * 60 * 1000
  const recentCount = hist.filter(t => t > twoMinAgo).length
  const hourlyCount = hist.filter(t => t > oneHourAgo).length
  if (recentCount > 0) return '⏳ Slow down! Wait 2 minutes between drinks.'
  if (hourlyCount >= 5) return '🚫 Max 5 drinks per hour. Pace yourself!'
  return null
}

const DRINK_TYPES = [
  { value: 'beer', label: '🍺 Beer/Seltzer/Wine', points: 1.5 },
  { value: 'cocktail', label: '🍸 Cocktail', points: 2 },
  { value: 'shot', label: '🥃 Shot', points: 2.5 },
  { value: 'shotgun', label: '🔫 Beer Shotgun', points: 4 },
  { value: 'birdie', label: '🦅 Birdie or Better', points: 1 },
  { value: 'mulligan', label: '⛳ Mulligan', points: -1 },
  { value: 'makeout', label: '💋 Dance Floor Makeout', points: 10 },
  { value: 'wingman', label: '🤝 Wingman Assist', points: 5 },
  { value: 'bird', label: '🐣 Brought a Bird Home', points: 30 },
]

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA') // YYYY-MM-DD local timezone
}

async function reverseGeocode(lat, lng) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(6000) }
  )
  if (!res.ok) throw new Error('Geocode failed')
  const data = await res.json()
  const a = data.address || {}
  return (
    a.tourism || a.amenity || a.bar || a.restaurant ||
    a.hotel || a.resort || a.leisure ||
    a.neighbourhood || a.suburb || a.village ||
    a.town || a.city || 'Unknown location'
  )
}

export default function SubmitDrink({ user, activeEvent, onSuccess }) {
  const [drinkType, setDrinkType] = useState('cocktail')
  const [quantity, setQuantity] = useState(1)
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [coords, setCoords] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle') // idle | loading | done | error
  const [photo, setPhoto] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [cooldown, setCooldown] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef(null)

  function detectLocation() {
    if (!navigator.geolocation) {
      setLocationStatus('error')
      return
    }
    setLocationStatus('loading')
    navigator.geolocation.getCurrentPosition(
      async pos => {
        try {
          const { latitude, longitude } = pos.coords
          setCoords({ lat: latitude, lng: longitude })
          const place = await reverseGeocode(latitude, longitude)
          setLocation(place)
          setLocationStatus('done')
        } catch {
          setLocation('')
          setLocationStatus('error')
        }
      },
      () => setLocationStatus('error'),
      { timeout: 8000 }
    )
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File must be an image.'); return }
    if (file.size > 20 * 1024 * 1024) { setError('Photo must be under 20MB.'); return }
    setError('')

    // Compress before storing (max 1600px, JPEG 0.85)
    const compressed = await compressImage(file, { maxDimension: 1600, quality: 0.85 })
    setPhoto(compressed)

    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.onerror = () => setError('Could not read photo. Try another.')
    reader.readAsDataURL(compressed)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!photo) { setError('Photo is required!'); return }
    if (!location.trim()) { setError('Please enter a location!'); return }
    if (cooldown) return

    // Rate limit check
    const rateLimitMsg = checkRateLimit()
    if (rateLimitMsg) { setError(rateLimitMsg); return }

    setError('')
    setSubmitting(true)

    try {
      // AI Photo Verification — send to Claude Vision
      const selected = DRINK_TYPES.find(d => d.value === drinkType)

      if (!navigator.onLine) {
        setError('📡 You appear to be offline. Connect to the internet to submit.')
        setSubmitting(false)
        return
      }

      // Skip AI verification for non-drink bonus categories
      const skipVerification = ['makeout', 'bird', 'wingman', 'shotgun', 'birdie', 'mulligan'].includes(drinkType)

      if (!skipVerification) {
        try {
          const reader = new FileReader()
          const base64 = await new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result.split(',')[1])
            reader.onerror = reject
            reader.readAsDataURL(photo)
          })

          // Get Firebase ID token for server-side auth + rate limiting
          let idToken = ''
          try {
            idToken = (await auth.currentUser?.getIdToken()) || ''
          } catch { /* ignore, fall through unauthenticated */ }

          const checkRes = await fetch('/api/checkPhoto', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
            },
            body: JSON.stringify({
              imageBase64: base64,
              mediaType: photo.type || 'image/jpeg',
              drinkType: selected.label,
            }),
          })

          if (!checkRes.ok) {
            throw new Error(`Verification server returned ${checkRes.status}`)
          }

          const check = await checkRes.json()
          if (!check.approved) {
            setError(`🚫 ${check.reason || 'Photo could not be verified'}`)
            setSubmitting(false)
            return
          }
        } catch (verifyErr) {
          console.warn('Photo verification unavailable:', verifyErr)
          setError('⚠️ Could not reach verification service. Check your connection and try again.')
          setSubmitting(false)
          return
        }
      }

      const imageRef = ref(storage, `drinks/${user.userId}_${Date.now()}`)
      await uploadBytes(imageRef, photo)
      const imageUrl = await getDownloadURL(imageRef)

      const drinkData = {
        userId: user.userId,
        name: user.name,
        profilePhoto: user.profilePhoto || '',
        imageUrl,
        drinkType: selected.value,
        quantity: quantity,
        points: selected.points * quantity,
        description: description.trim(),
        location: location.trim(),
        day: getTodayStr(),
        eventId: activeEvent?.id || '',
        likes: [],
        comments: [],
        createdAt: serverTimestamp(),
      }
      // Remove null/undefined values that Firestore might reject
      if (!coords?.lat) { delete drinkData.lat; delete drinkData.lng; }
      else { drinkData.lat = coords.lat; drinkData.lng = coords.lng; }

      await addDoc(collection(db, 'drinks'), drinkData)
      addSubmitTimestamp()

      // Haptic feedback on successful submit
      if (navigator.vibrate) {
        const isBigPlay = ['makeout', 'bird', 'wingman', 'shotgun'].includes(selected.value)
        navigator.vibrate(isBigPlay ? [100, 50, 100, 50, 200] : [80, 40, 80])
      }

      setPhoto(null)
      setPhotoPreview(null)
      setDescription('')
      setLocation('')
      setCoords(null)
      setLocationStatus('idle')
      setDrinkType('cocktail')
      setQuantity(1)
      if (fileInputRef.current) fileInputRef.current.value = ''

      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)

      setCooldown(true)
      setTimeout(() => setCooldown(false), 120000) // 2 min cooldown

      // Auto-close the form
      if (onSuccess) onSuccess()
    } catch (err) {
      console.error('Submit error:', err)
      setError(`Error: ${err.code || err.message || 'Unknown error'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Photo upload */}
      <div
        onClick={() => !submitting && fileInputRef.current?.click()}
        className="relative w-full aspect-video bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-amber-500 transition-colors"
      >
        {photoPreview ? (
          <img src={photoPreview} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <div className="text-center text-slate-400">
            <div className="text-4xl mb-1">📸</div>
            <div className="text-sm font-medium">Tap to add photo</div>
            <div className="text-xs text-slate-500 mt-1">Library or camera</div>
          </div>
        )}
        {photoPreview && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <span className="text-white text-sm font-medium">Change photo</span>
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        className="hidden"
        aria-label="Upload drink photo"
      />

      {/* Drink type */}
      <div className="grid grid-cols-3 gap-2">
        {DRINK_TYPES.map(type => (
          <button
            key={type.value}
            type="button"
            onClick={() => setDrinkType(type.value)}
            className={`py-3 rounded-xl text-sm font-semibold transition-all ${
              drinkType === type.value
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div>{type.label}</div>
            <div className={`text-xs mt-0.5 ${drinkType === type.value ? 'text-amber-200' : 'text-slate-500'}`}>
              {type.points} pt{type.points !== 1 ? 's' : ''}
            </div>
          </button>
        ))}
      </div>

      {/* Quantity */}
      <div>
        <label className="text-sm font-semibold text-slate-400 mb-2 block">How many?</label>
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              onClick={() => setQuantity(n)}
              className={`w-11 h-11 rounded-full text-sm font-bold transition-all ${
                quantity === n
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500'
              }`}
            >
              {n}
            </button>
          ))}
          <span className="text-sm text-slate-500 ml-1">
            = {(DRINK_TYPES.find(d => d.value === drinkType)?.points || 1) * quantity} pts
          </span>
        </div>
      </div>

      {/* Location — tap to detect OR type */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={detectLocation}
          disabled={locationStatus === 'loading'}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-slate-800 text-slate-300 border border-slate-700 hover:border-amber-500 disabled:opacity-50"
        >
          {locationStatus === 'loading' ? '⏳ Locating...' : '📍 Auto-Detect Location'}
        </button>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Or type your location"
          maxLength={80}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Description */}
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Caption (optional)"
        maxLength={120}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
      />

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      {success && <p className="text-green-400 text-sm text-center font-semibold">🎉 Drink submitted!</p>}

      <button
        type="submit"
        disabled={submitting || cooldown || !photo}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          submitting || cooldown || !photo
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-amber-600 to-violet-600 text-white shadow-lg shadow-amber-600/30 active:scale-95'
        }`}
      >
        {submitting ? '⏳ Sending...' : cooldown ? '✅ Sent! Wait...' : '☘️ Submit Drink/Activity'}
      </button>
    </form>
  )
}
