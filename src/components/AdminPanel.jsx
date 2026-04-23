import { useState, useEffect } from 'react'
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, Timestamp, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

const ADMIN_PIN = '2026'
const DRINK_EMOJI = { beer: '🍺', cocktail: '🍸', shot: '🥃' }

export default function AdminPanel({ drinks, activeEvent }) {
  const [authed, setAuthed] = useState(false)
  const [pin, setPin] = useState('')
  const [users, setUsers] = useState([])
  const [expandedUser, setExpandedUser] = useState(null)
  const [announcement, setAnnouncement] = useState('')
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState('')

  // Event management state
  const [events, setEvents] = useState([])
  const [newEventName, setNewEventName] = useState('')
  const [newEventStart, setNewEventStart] = useState('')
  const [newEventEnd, setNewEventEnd] = useState('')

  // Load all events
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return unsub
  }, [])

  // Build user list from drinks
  useEffect(() => {
    const map = {}
    drinks.forEach(d => {
      if (!map[d.userId]) map[d.userId] = { userId: d.userId, name: d.name, points: 0, count: 0, drinks: [] }
      map[d.userId].points += d.points || 0
      map[d.userId].count += 1
      map[d.userId].drinks.push(d)
    })
    // Sort each user's drinks newest first
    Object.values(map).forEach(u => {
      u.drinks.sort((a, b) => {
        const aT = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
        const bT = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
        return bT - aT
      })
    })
    setUsers(Object.values(map).sort((a, b) => b.points - a.points))
  }, [drinks])

  async function createEvent() {
    if (!newEventName.trim() || !newEventStart || !newEventEnd) {
      setMsg('❌ Fill in all event fields')
      return
    }
    setBusy('Creating event...')
    try {
      // Deactivate all other events first
      for (const evt of events) {
        if (evt.active) {
          await updateDoc(doc(db, 'events', evt.id), { active: false })
        }
      }
      await addDoc(collection(db, 'events'), {
        name: newEventName.trim(),
        startDate: Timestamp.fromDate(new Date(newEventStart + 'T00:00:00')),
        endDate: Timestamp.fromDate(new Date(newEventEnd + 'T23:59:59')),
        active: true,
        createdAt: Timestamp.now(),
      })
      setNewEventName('')
      setNewEventStart('')
      setNewEventEnd('')
      setMsg('✅ Event created and set as active!')
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`)
    }
    setBusy('')
  }

  async function toggleEventActive(eventId, currentActive) {
    setBusy('Updating...')
    try {
      if (!currentActive) {
        // Deactivate all others first
        for (const evt of events) {
          if (evt.active) {
            await updateDoc(doc(db, 'events', evt.id), { active: false })
          }
        }
      }
      await updateDoc(doc(db, 'events', eventId), { active: !currentActive })
      setMsg(currentActive ? '✅ Event deactivated' : '✅ Event activated')
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`)
    }
    setBusy('')
  }

  async function deleteEvent(eventId, eventName) {
    if (!confirm(`Delete event "${eventName}"? This won't delete drinks.`)) return
    setBusy('Deleting event...')
    try {
      await deleteDoc(doc(db, 'events', eventId))
      setMsg(`✅ Event "${eventName}" deleted`)
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`)
    }
    setBusy('')
  }

  async function deleteUser(userId, userName) {
    if (!confirm(`Delete ALL drinks from ${userName}?`)) return
    setBusy(`Deleting ${userName}...`)
    try {
      const snap = await getDocs(collection(db, 'drinks'))
      let count = 0
      for (const d of snap.docs) {
        if (d.data().userId === userId) {
          await deleteDoc(doc(db, 'drinks', d.id))
          count++
        }
      }
      setExpandedUser(null)
      setMsg(`✅ Deleted ${count} drinks from ${userName}`)
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`)
    }
    setBusy('')
  }

  async function deleteSingleDrink(drinkId, drinkLabel) {
    setBusy('Deleting...')
    try {
      await deleteDoc(doc(db, 'drinks', drinkId))
      setMsg(`✅ Deleted: ${drinkLabel}`)
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`)
    }
    setBusy('')
  }

  async function postAnnouncement() {
    if (!announcement.trim()) return
    setBusy('Posting...')
    try {
      await addDoc(collection(db, 'drinks'), {
        userId: 'ADMIN',
        name: '🏆 ADMIN',
        profilePhoto: '',
        imageUrl: '',
        drinkType: 'cocktail',
        quantity: 1,
        points: 1,
        description: announcement.trim(),
        location: 'HQ',
        day: new Date().toLocaleDateString('en-CA'),
        eventId: activeEvent?.id || '',
        likes: [],
        comments: [],
        createdAt: Timestamp.now(),
      })
      setAnnouncement('')
      setMsg('✅ Announcement posted to feed!')
    } catch (err) {
      setMsg(`❌ Error: ${err.message}`)
    }
    setBusy('')
  }

  function formatTime(d) {
    if (!d.createdAt?.toDate) return ''
    const date = d.createdAt.toDate()
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function formatEventDate(ts) {
    if (!ts?.toDate) return ''
    return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm">
          <h1 className="text-2xl font-black text-white text-center mb-2">🔒 Admin Panel</h1>
          <p className="text-slate-400 text-sm text-center mb-4">Enter PIN to continue</p>
          <input
            type="password"
            value={pin}
            onChange={e => setPin(e.target.value)}
            placeholder="PIN"
            autoFocus
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-slate-600 focus:outline-none focus:border-blue-500 mb-4"
            onKeyDown={e => { if (e.key === 'Enter' && pin === ADMIN_PIN) setAuthed(true) }}
          />
          <button
            onClick={() => pin === ADMIN_PIN ? setAuthed(true) : setMsg('❌ Wrong PIN')}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-violet-600 active:scale-95 transition-all"
          >
            Enter
          </button>
          {msg && <p className="text-red-400 text-sm text-center mt-3">{msg}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 pb-20">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-white">🛡️ Admin Panel</h1>
          <a href="/" className="text-sm text-blue-400 font-semibold">← Back to App</a>
        </div>

        {msg && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white flex items-center justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg('')} className="ml-2 text-slate-500 text-lg">✕</button>
          </div>
        )}

        {busy && (
          <div className="text-center text-blue-400 text-sm font-semibold animate-pulse">{busy}</div>
        )}

        {/* Create Event */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white mb-3">🎉 Create Event</h2>
          <div className="space-y-3">
            <input
              type="text"
              value={newEventName}
              onChange={e => setNewEventName(e.target.value)}
              placeholder="Event name (e.g. Vegas Weekend)"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Start Date</label>
                <input
                  type="date"
                  value={newEventStart}
                  onChange={e => setNewEventStart(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">End Date</label>
                <input
                  type="date"
                  value={newEventEnd}
                  onChange={e => setNewEventEnd(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={createEvent}
              disabled={!newEventName.trim() || !newEventStart || !newEventEnd || !!busy}
              className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-violet-600 disabled:opacity-40 active:scale-95 transition-all"
            >
              Create & Activate Event
            </button>
          </div>
        </div>

        {/* Events List */}
        {events.length > 0 && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
            <h2 className="text-lg font-bold text-white mb-3">📋 Events ({events.length})</h2>
            <div className="space-y-2">
              {events.map(evt => (
                <div key={evt.id} className={`flex items-center justify-between rounded-xl px-4 py-3 ${evt.active ? 'bg-green-500/10 border border-green-500/30' : 'bg-slate-800'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-semibold truncate">{evt.name}</span>
                      {evt.active && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {formatEventDate(evt.startDate)} — {formatEventDate(evt.endDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <button
                      onClick={() => toggleEventActive(evt.id, evt.active)}
                      disabled={!!busy}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                        evt.active
                          ? 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20'
                          : 'text-green-400 bg-green-500/10 border border-green-500/20'
                      }`}
                    >
                      {evt.active ? '⏸️ End' : '▶️ Start'}
                    </button>
                    <button
                      onClick={() => deleteEvent(evt.id, evt.name)}
                      disabled={!!busy}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 active:scale-95 transition-all"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Post Announcement */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white mb-3">📢 Post Announcement</h2>
          <textarea
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            placeholder="Type announcement for the feed..."
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none mb-3"
          />
          <button
            onClick={postAnnouncement}
            disabled={!announcement.trim() || busy}
            className="w-full py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-600 to-violet-600 disabled:opacity-40 active:scale-95 transition-all"
          >
            Post to Feed
          </button>
        </div>

        {/* User Management — tap to expand */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4">
          <h2 className="text-lg font-bold text-white mb-3">👥 Users ({users.length})</h2>
          <div className="space-y-2">
            {users.map(u => (
              <div key={u.userId}>
                {/* User row */}
                <div
                  onClick={() => setExpandedUser(expandedUser === u.userId ? null : u.userId)}
                  className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-all ${
                    expandedUser === u.userId ? 'bg-slate-700 border border-blue-500/30' : 'bg-slate-800 hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{expandedUser === u.userId ? '▼' : '▶'}</span>
                    <div>
                      <div className="text-white font-semibold">{u.name}</div>
                      <div className="text-xs text-slate-400">{u.count} drinks · {u.points} pts</div>
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deleteUser(u.userId, u.name) }}
                    disabled={!!busy}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all"
                  >
                    🗑️ All
                  </button>
                </div>

                {/* Expanded — individual drinks */}
                {expandedUser === u.userId && (
                  <div className="mt-1 ml-4 space-y-1.5 border-l-2 border-blue-500/20 pl-3 py-2">
                    {u.drinks.map(d => (
                      <div key={d.id} className="flex items-center gap-2 bg-slate-800/50 rounded-lg px-3 py-2">
                        {d.imageUrl && (
                          <img src={d.imageUrl} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-white font-medium">
                            {DRINK_EMOJI[d.drinkType] || '🍸'} {d.drinkType}
                            {d.quantity > 1 ? ` ×${d.quantity}` : ''}
                            <span className="text-blue-400 ml-1">{d.points}pts</span>
                          </div>
                          <div className="text-xs text-slate-500 truncate">
                            {d.location || 'no loc'} · {d.day} {formatTime(d)}
                          </div>
                          {d.description && (
                            <div className="text-xs text-slate-400 truncate mt-0.5">"{d.description}"</div>
                          )}
                        </div>
                        <button
                          onClick={() => deleteSingleDrink(d.id, `${d.name}'s ${d.drinkType}`)}
                          disabled={!!busy}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-95 transition-all flex-shrink-0"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
