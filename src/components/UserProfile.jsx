import {
  friendshipId,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriendshipStatus,
} from '../utils/friends'
import { useState } from 'react'

const DRINK_EMOJI = { beer: '🍺', wine: '🍷', shot: '🥃', cocktail: '🍸' }
const DRINK_LABEL = { beer: 'Beer/Seltzer/Wine', wine: 'Beer/Seltzer/Wine', shot: 'Shot', cocktail: 'Cocktail' }

function timeAgo(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function getLabel(points) {
  if (points <= 2) return { text: 'On the Board', color: 'text-slate-400' }
  if (points <= 5) return { text: 'In the Mix', color: 'text-blue-400' }
  if (points <= 8) return { text: 'Heating Up', color: 'text-orange-400' }
  if (points <= 11) return { text: 'Danger Zone', color: 'text-red-400' }
  return { text: 'Absolute Menace', color: 'text-purple-400' }
}

function formatDayShort(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short' })
}

export default function UserProfile({ profile, currentUser, drinks, friendships, onClose }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  if (!profile) return null

  const userDrinks = drinks
    .filter(d => d.userId === profile.userId)
    .sort((a, b) => {
      const aTime = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0)
      const bTime = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0)
      return bTime - aTime
    })

  const totalPoints = userDrinks.reduce((sum, d) => sum + d.points, 0)
  const label = getLabel(totalPoints)
  const status = getFriendshipStatus(currentUser.userId, profile.userId, friendships)
  const fid = friendshipId(currentUser.userId, profile.userId)

  async function handleFriendAction(action) {
    setErr('')
    setBusy(true)
    try {
      if (action === 'add') await sendFriendRequest(currentUser.userId, profile.userId)
      else if (action === 'accept') await acceptFriendRequest(fid)
      else if (action === 'remove') await removeFriendship(fid)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  const byDay = {}
  userDrinks.forEach(d => {
    if (d.day) byDay[d.day] = (byDay[d.day] || 0) + d.points
  })
  const sortedDays = Object.keys(byDay).sort()

  let friendButton = null
  if (status === 'self') {
    friendButton = null
  } else if (status === 'friends') {
    friendButton = (
      <button
        onClick={() => handleFriendAction('remove')}
        disabled={busy}
        className="text-xs font-semibold text-slate-400 hover:text-red-400 px-4 py-2 rounded-full transition-colors border border-white/10"
      >
        ✓ Friends
      </button>
    )
  } else if (status === 'pending_sent') {
    friendButton = (
      <button
        onClick={() => handleFriendAction('remove')}
        disabled={busy}
        className="text-xs font-semibold text-slate-400 hover:text-red-400 px-4 py-2 rounded-full border border-white/10 transition-colors"
      >
        Pending · Cancel
      </button>
    )
  } else if (status === 'pending_received') {
    friendButton = (
      <button
        onClick={() => handleFriendAction('accept')}
        disabled={busy}
        className="text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 rounded-full active:scale-95 transition-all disabled:opacity-50"
      >
        Accept Request
      </button>
    )
  } else {
    friendButton = (
      <button
        onClick={() => handleFriendAction('add')}
        disabled={busy}
        className="text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-2 rounded-full active:scale-95 transition-all disabled:opacity-50"
      >
        + Add Friend
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative rounded-t-3xl max-h-[90vh] flex flex-col"
        style={{ background: 'rgba(10,15,25,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.09)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-4 pt-2 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt={profile.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-blue-500"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-black text-2xl">
                {profile.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-black text-white truncate">{profile.name}</h2>
              {profile.username && (
                <div className="text-xs text-slate-500 font-medium">@{profile.username}</div>
              )}
              <div className={`text-sm font-semibold ${label.color} mt-0.5`}>{label.text}</div>
              <div className="text-slate-500 text-xs mt-0.5">{userDrinks.length} drink{userDrinks.length !== 1 ? 's' : ''}</div>
            </div>
            <div className="text-right">
              <div className="text-4xl font-black text-white">{totalPoints}</div>
              <div className="text-xs text-slate-400">total pts</div>
            </div>
          </div>

          {/* Friend action button */}
          {friendButton && (
            <div className="mt-4 flex justify-center">{friendButton}</div>
          )}
          {err && <p className="text-red-400 text-xs text-center mt-2">{err}</p>}

          {/* Points by day */}
          {sortedDays.length > 0 && (
            <div className="flex gap-2 overflow-x-auto mt-4 pb-1" style={{ scrollbarWidth: 'none' }}>
              {sortedDays.map(dayStr => (
                <div key={dayStr} className="bg-slate-800 rounded-xl p-2 text-center flex-shrink-0" style={{ minWidth: '70px' }}>
                  <div className="text-xs text-slate-400">{formatDayShort(dayStr)}</div>
                  <div className="text-lg font-black text-white">{byDay[dayStr]}</div>
                  <div className="text-xs text-slate-500">pts</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Drinks grid */}
        <div className="overflow-y-auto flex-1 p-4">
          <h3 className="text-sm font-semibold text-slate-400 mb-3">All Drinks</h3>
          {userDrinks.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-10">No drinks logged yet</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {userDrinks.map(drink => (
                <div key={drink.id} className="bg-slate-800 rounded-xl overflow-hidden">
                  <img
                    src={drink.imageUrl}
                    alt="drink"
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                  />
                  <div className="p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300">
                        {DRINK_EMOJI[drink.drinkType]} {DRINK_LABEL[drink.drinkType]}
                      </span>
                      <span className="text-xs text-blue-400 font-bold">+{drink.points}pt</span>
                    </div>
                    {drink.description && (
                      <p className="text-xs text-slate-500 mt-1 truncate">{drink.description}</p>
                    )}
                    <p className="text-xs text-slate-600 mt-0.5">{formatDayShort(drink.day)} · {timeAgo(drink.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
