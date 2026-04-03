import { useState, useRef } from 'react'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../firebase'

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
  { value: 'cocktail', label: '🍹 Cocktail', points: 2 },
  { value: 'shot', label: '🥃 Shot', points: 2.5 },
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

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File must be an image.'); return }
    if (file.size > 10 * 1024 * 1024) { setError('Photo must be under 10MB.'); return }
    setError('')
    setPhoto(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target.result)
    reader.onerror = () => setError('Could not read photo. Try another.')
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!photo) { setError('Photo is required!'); return }
    if (!location.trim()) { setError('Please enter a location!'); return }
    if (!activeEvent) { setError('No active event! Ask an admin to create one.'); return }
    if (cooldown) return

    // Rate limit check
    const rateLimitMsg = checkRateLimit()
    if (rateLimitMsg) { setError(rateLimitMsg); return }

    setError('')
    setSubmitting(true)

    try {
      // AI Photo Verification — send to Claude Vision
      const selected = DRINK_TYPES.find(d => d.value === drinkType)
      try {
        const reader = new FileReader()
        const base64 = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result.split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(photo)
        })
        const checkRes = await fetch('/api/checkPhoto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mediaType: photo.type || 'image/jpeg',
            drinkType: selected.label,
          }),
        })
        const check = await checkRes.json()
        if (!check.approved) {
          setError(`🚫 Photo rejected: ${check.reason}`)
          setSubmitting(false)
          return
        }
      } catch (verifyErr) {
        console.warn('Photo verification unavailable, proceeding:', verifyErr)
        // If verification fails (network etc), allow through
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
        eventId: activeEvent.id,
        likes: [],
        comments: [],
        createdAt: serverTimestamp(),
      }
      // Remove null/undefined values that Firestore might reject
      if (!coords?.lat) { delete drinkData.lat; delete drinkData.lng; }
      else { drinkData.lat = coords.lat; drinkData.lng = coords.lng; }

      await addDoc(collection(db, 'drinks'), drinkData)
      addSubmitTimestamp()

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
        className="relative w-full aspect-video bg-slate-800 rounded-xl border-2 border-dashed border-slate-600 flex items-center justify-center cursor-pointer overflow-hidden hover:border-pink-500 transition-colors"
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
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <div>{type.label}</div>
            <div className={`text-xs mt-0.5 ${drinkType === type.value ? 'text-pink-200' : 'text-slate-500'}`}>
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
                  ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-pink-500'
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
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-all bg-slate-800 text-slate-300 border border-slate-700 hover:border-pink-500 disabled:opacity-50"
        >
          {locationStatus === 'loading' ? '⏳ Locating...' : '📍 Auto-Detect Location'}
        </button>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Or type your location"
          maxLength={80}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
        />
      </div>

      {/* Description */}
      <input
        type="text"
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="Caption (optional)"
        maxLength={120}
        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 transition-colors"
      />

      {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      {success && <p className="text-green-400 text-sm text-center font-semibold">🎉 Drink submitted!</p>}

      <button
        type="submit"
        disabled={submitting || cooldown || !photo || !activeEvent}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
          submitting || cooldown || !photo || !activeEvent
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-600/30 active:scale-95'
        }`}
      >
        {submitting ? '⏳ Sending...' : cooldown ? '✅ Sent! Wait...' : !activeEvent ? '⚠️ No Active Event' : '🍹 Log This Send'}
      </button>
    </form>
  )
}
