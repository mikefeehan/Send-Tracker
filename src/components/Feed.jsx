import { useState } from 'react'
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DRINK_EMOJI = { beer: '🍺', wine: '🍷', shot: '🥃', cocktail: '🍹' }
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

const DRINK_TYPES = [
  { value: 'beer', label: '🍺 Beer/Seltzer/Wine', points: 1.5 },
  { value: 'cocktail', label: '🍹 Cocktail', points: 2 },
  { value: 'shot', label: '🥃 Shot', points: 2.5 },
]

function DrinkCard({ drink, user }) {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const isOwner = drink.userId === user.userId

  const [editQty, setEditQty] = useState(drink.quantity || 1)
  const [editType, setEditType] = useState(drink.drinkType)

  async function saveEdit() {
    const selected = DRINK_TYPES.find(d => d.value === editType)
    if (!selected) return
    try {
      const drinkRef = doc(db, 'drinks', drink.id)
      await updateDoc(drinkRef, {
        drinkType: selected.value,
        quantity: editQty,
        points: selected.points * editQty,
      })
      setEditing(false)
    } catch (err) {
      console.error('Edit failed:', err)
    }
  }

  async function handleDelete() {
    try {
      await deleteDoc(doc(db, 'drinks', drink.id))
      setConfirmDelete(false)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const likes = drink.likes || []
  const comments = drink.comments || []
  const isLiked = likes.includes(user.userId)
  async function toggleLike() {
    try {
      const ref = doc(db, 'drinks', drink.id)
      await updateDoc(ref, {
        likes: isLiked ? arrayRemove(user.userId) : arrayUnion(user.userId)
      })
    } catch (err) {
      console.error('Like failed:', err)
    }
  }

  async function postComment(e) {
    e.preventDefault()
    if (!commentText.trim() || posting) return
    setPosting(true)
    try {
      const ref = doc(db, 'drinks', drink.id)
      await updateDoc(ref, {
        comments: arrayUnion({
          userId: user.userId,
          name: user.name,
          text: commentText.trim(),
          at: Date.now(),
        })
      })
      setCommentText('')
    } catch (err) {
      console.error('Comment failed:', err)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(10,15,25,0.65)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
      {/* Image */}
      <img
        src={drink.imageUrl}
        alt={`${drink.name}'s drink`}
        className="w-full aspect-video object-cover"
        loading="lazy"
        onError={e => { e.target.style.display = 'none' }}
      />

      {/* Info row */}
      <div className="p-3 flex items-start gap-3">
        {drink.profilePhoto ? (
          <img
            src={drink.profilePhoto}
            alt={drink.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-slate-600 flex-shrink-0 mt-0.5"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 mt-0.5">
            {drink.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white truncate">{drink.name}</span>
            <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(drink.createdAt)}</span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-sm">{drink.quantity > 1 ? `${drink.quantity}x ` : ''}{DRINK_EMOJI[drink.drinkType]} {DRINK_LABEL[drink.drinkType]}</span>
            <span className="text-xs bg-pink-600/20 text-pink-400 px-2 py-0.5 rounded-full">
              +{drink.points} pt{drink.points !== 1 ? 's' : ''}
            </span>
            <span className="text-xs text-slate-500">{(() => {
              if (!drink.day) return ''
              const d = new Date(drink.day + 'T12:00:00')
              return d.toLocaleDateString('en-US', { weekday: 'short' })
            })()}</span>
          </div>
          {drink.location && (
            <div className="text-xs text-slate-400 mt-1">📍 {drink.location}</div>
          )}
          {drink.description && (
            <p className="text-sm text-slate-400 mt-1">{drink.description}</p>
          )}
        </div>
      </div>

      {/* Like + Comment bar */}
      <div className="px-3 pb-2 flex items-center gap-4 border-t border-slate-700/40 pt-2">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            isLiked ? 'text-pink-400' : 'text-slate-400 hover:text-pink-400'
          }`}
        >
          <span className="text-base">{isLiked ? '❤️' : '🤍'}</span>
          <span>{likes.length > 0 ? likes.length : ''}</span>
        </button>

        <button
          onClick={() => setShowComments(v => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white transition-colors"
        >
          <span className="text-base">💬</span>
          <span>{comments.length > 0 ? comments.length : ''}</span>
        </button>

        {isOwner && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setEditing(v => !v)}
              className="text-xs font-medium text-slate-500 hover:text-white transition-colors"
            >
              ✏️ Edit
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs font-medium text-slate-500 hover:text-red-400 transition-colors"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Edit drink type + quantity */}
      {editing && (
        <div className="px-3 pb-3 border-t border-slate-700/40 pt-2 space-y-3">
          <div>
            <p className="text-xs text-slate-400 mb-2">Drink type:</p>
            <div className="grid grid-cols-3 gap-1.5">
              {DRINK_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setEditType(type.value)}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    editType === type.value
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-slate-400 mb-2">How many?</p>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setEditQty(n)}
                  className={`w-9 h-9 rounded-full text-xs font-bold transition-all ${
                    editQty === n
                      ? 'bg-pink-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-slate-500 ml-1">
                = {(DRINK_TYPES.find(d => d.value === editType)?.points || 1) * editQty} pts
              </span>
            </div>
          </div>
          <button
            onClick={saveEdit}
            className="w-full py-2 rounded-lg text-sm font-semibold bg-pink-600 text-white active:scale-95 transition-all"
          >
            Save Changes
          </button>
        </div>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="px-3 pb-3 border-t border-slate-700/40 pt-2">
          <p className="text-sm text-white font-semibold mb-2">Delete this drink?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-slate-700 text-slate-300"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white active:scale-95 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Comments section */}
      {showComments && (
        <div className="px-3 pb-3 space-y-2 border-t border-slate-700/40 pt-2">
          {comments.length === 0 && (
            <p className="text-xs text-slate-500">No comments yet.</p>
          )}
          {comments.map((c, i) => (
            <div key={`${c.userId}_${c.at}_${i}`} className="flex gap-2">
              <span className="text-xs font-semibold text-pink-400 flex-shrink-0">{c.name}</span>
              <span className="text-xs text-slate-300">{c.text}</span>
            </div>
          ))}

          {/* Add comment */}
          <form onSubmit={postComment} className="flex gap-2 mt-2">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              maxLength={200}
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || posting}
              className="px-3 py-1.5 bg-pink-600 text-white text-sm font-semibold rounded-lg disabled:opacity-40"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

export default function Feed({ drinks, user }) {
  // Sort newest first
  const sorted = [...drinks].sort((a, b) => {
    const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0
    const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0
    return bTime - aTime
  })

  if (sorted.length === 0) {
    return (
      <div className="text-center py-14" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)' }}>
        <div className="text-6xl mb-4">📭</div>
        <p className="text-white text-lg font-bold">No drinks logged yet</p>
        <p className="text-slate-200 text-base mt-2">Start the party! 🎉</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {sorted.map(drink => (
        <DrinkCard key={drink.id} drink={drink} user={user} />
      ))}
    </div>
  )
}
