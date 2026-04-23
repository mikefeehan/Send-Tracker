import { useState, useMemo } from 'react'
import {
  friendshipId,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  getFriendshipStatus,
  getAcceptedFriendUids,
  getIncomingRequests,
} from '../utils/friends'

function Avatar({ user, size = 'md' }) {
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-base'
  if (user?.profilePhoto) {
    return <img src={user.profilePhoto} alt={user.name} className={`${sizeClass} rounded-full object-cover border-2 border-white/10`} />
  }
  return (
    <div className={`${sizeClass} rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold`}>
      {(user?.name || '?').charAt(0).toUpperCase()}
    </div>
  )
}

export default function FriendsModal({ currentUser, allUsers, friendships, onClose, onOpenProfile }) {
  const [tab, setTab] = useState('friends') // 'friends' | 'requests' | 'search'
  const [searchQ, setSearchQ] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')

  const friendUids = getAcceptedFriendUids(currentUser.userId, friendships)
  const friends = allUsers.filter(u => friendUids.includes(u.userId))
  const incoming = getIncomingRequests(currentUser.userId, friendships)
  const incomingWithUser = incoming
    .map(f => ({ friendship: f, user: allUsers.find(u => u.userId === f.requestedBy) }))
    .filter(x => x.user)

  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase().replace(/^@/, '')
    const base = allUsers
      .filter(u => u.userId !== currentUser.userId)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    if (!q) return base
    return base.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q)
    )
  }, [searchQ, allUsers, currentUser.userId])

  async function handleAdd(otherUid) {
    setErr('')
    setBusy(otherUid)
    try {
      await sendFriendRequest(currentUser.userId, otherUid)
    } catch (e) {
      setErr(e.message)
    }
    setBusy('')
  }

  async function handleAccept(id) {
    setBusy(id)
    try {
      await acceptFriendRequest(id)
    } catch (e) {
      setErr(e.message)
    }
    setBusy('')
  }

  async function handleRemove(id) {
    setBusy(id)
    try {
      await removeFriendship(id)
    } catch (e) {
      setErr(e.message)
    }
    setBusy('')
  }

  function renderUserRow(user, actions) {
    return (
      <div key={user.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-900/60 border border-white/5">
        <button onClick={() => onOpenProfile(user)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <Avatar user={user} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white truncate">{user.name}</div>
            {user.username && <div className="text-[11px] text-slate-500 truncate">@{user.username}</div>}
          </div>
        </button>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {actions}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative rounded-t-3xl max-h-[92vh] flex flex-col"
        style={{ background: 'rgba(10,15,25,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.09)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-4 pt-2 pb-3">
          <h2 className="text-xl font-black text-white text-center mb-3">Friends</h2>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-2xl" style={{ background: 'rgba(10,18,34,0.6)', border: '1px solid rgba(255,255,255,0.05)' }}>
            {[
              ['friends', `Friends${friends.length ? ` (${friends.length})` : ''}`],
              ['requests', `Requests${incoming.length ? ` (${incoming.length})` : ''}`],
              ['search', 'Find'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`py-2 text-xs font-semibold transition-all duration-200 ${
                  tab === key ? 'seg-active' : 'seg-inactive'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-6 space-y-2">
          {err && <p className="text-red-400 text-xs text-center">{err}</p>}

          {tab === 'friends' && (
            <>
              {friends.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">👥</div>
                  <p className="text-white font-semibold">No friends yet</p>
                  <p className="text-slate-400 text-sm mt-1">Use the Find tab to add some</p>
                </div>
              ) : (
                friends.map(u => renderUserRow(u,
                  <button
                    onClick={() => handleRemove(friendshipId(currentUser.userId, u.userId))}
                    disabled={busy === friendshipId(currentUser.userId, u.userId)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-full transition-colors"
                  >
                    Remove
                  </button>
                ))
              )}
            </>
          )}

          {tab === 'requests' && (
            <>
              {incomingWithUser.length === 0 ? (
                <div className="text-center py-10">
                  <div className="text-4xl mb-2">📭</div>
                  <p className="text-white font-semibold">No pending requests</p>
                </div>
              ) : (
                incomingWithUser.map(({ friendship, user }) => renderUserRow(user,
                  <>
                    <button
                      onClick={() => handleAccept(friendship.id)}
                      disabled={busy === friendship.id}
                      className="text-[11px] font-bold text-white bg-gradient-to-r from-amber-600 to-yellow-600 px-3 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleRemove(friendship.id)}
                      disabled={busy === friendship.id}
                      className="text-[11px] font-semibold text-slate-400 hover:text-red-400 px-2 py-1.5 rounded-full transition-colors"
                    >
                      Decline
                    </button>
                  </>
                ))
              )}
            </>
          )}

          {tab === 'search' && (
            <>
              <input
                type="text"
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Search by name or @username..."
                autoFocus
                className="w-full bg-slate-900/60 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors mb-2"
              />

              {searchResults.length === 0 && (
                <p className="text-center text-slate-500 text-sm py-6">
                  {searchQ.trim() ? `No matches for "${searchQ}"` : 'No other users yet'}
                </p>
              )}

              {searchResults.map(u => {
                const status = getFriendshipStatus(currentUser.userId, u.userId, friendships)
                const id = friendshipId(currentUser.userId, u.userId)
                let action
                if (status === 'friends') {
                  action = <span className="text-[11px] font-semibold text-emerald-400 px-3 py-1.5">✓ Friends</span>
                } else if (status === 'pending_sent') {
                  action = (
                    <button
                      onClick={() => handleRemove(id)}
                      disabled={busy === id}
                      className="text-[11px] font-semibold text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-full transition-colors"
                    >
                      Cancel
                    </button>
                  )
                } else if (status === 'pending_received') {
                  action = (
                    <button
                      onClick={() => handleAccept(id)}
                      disabled={busy === id}
                      className="text-[11px] font-bold text-white bg-gradient-to-r from-amber-600 to-yellow-600 px-3 py-1.5 rounded-full active:scale-95 transition-all"
                    >
                      Accept
                    </button>
                  )
                } else {
                  action = (
                    <button
                      onClick={() => handleAdd(u.userId)}
                      disabled={busy === u.userId}
                      className="text-[11px] font-bold text-white bg-gradient-to-r from-amber-600 to-yellow-600 px-3 py-1.5 rounded-full active:scale-95 transition-all disabled:opacity-50"
                    >
                      + Add
                    </button>
                  )
                }
                return renderUserRow(u, action)
              })}
            </>
          )}
        </div>

        <div className="p-4 border-t border-white/5">
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
