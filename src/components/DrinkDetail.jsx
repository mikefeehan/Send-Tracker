import { useState } from 'react'
import { doc, updateDoc, arrayUnion, arrayRemove, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'

const DRINK_EMOJI = { beer: '🍺', wine: '🍷', shot: '🥃', cocktail: '🍸', shotgun: '🔫', birdie: '🦅', mulligan: '⛳', makeout: '💋', bird: '🐣', wingman: '🤝' }
const DRINK_LABEL = { beer: 'Beer/Seltzer/Wine', wine: 'Beer/Seltzer/Wine', shot: 'Shot', cocktail: 'Cocktail', shotgun: 'Beer Shotgun', birdie: 'Birdie or Better', mulligan: 'Mulligan', makeout: 'Dance Floor Makeout', bird: 'Brought a Bird Home', wingman: 'Wingman Assist' }

function timeAgo(timestamp) {
  if (!timestamp) return ''
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  const diff = Math.floor((Date.now() - date.getTime()) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export default function DrinkDetail({ drink, user, onClose }) {
  const [commentText, setCommentText] = useState('')
  const [posting, setPosting] = useState(false)

  if (!drink) return null

  const likes = drink.likes || []
  const comments = drink.comments || []
  const isLiked = likes.includes(user.userId)
  const isOwner = drink.userId === user.userId

  async function toggleLike() {
    try {
      await updateDoc(doc(db, 'drinks', drink.id), {
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
      await updateDoc(doc(db, 'drinks', drink.id), {
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

  async function handleDelete() {
    try {
      await deleteDoc(doc(db, 'drinks', drink.id))
      onClose()
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative rounded-t-3xl max-h-[95vh] flex flex-col overflow-hidden"
        style={{ background: 'rgba(10,15,25,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.09)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="overflow-y-auto flex-1">
          {/* Full-size photo */}
          <img
            src={drink.imageUrl}
            alt={`${drink.name}'s drink`}
            className="w-full max-h-[50vh] object-contain bg-black"
          />

          {/* Info */}
          <div className="p-4 space-y-3">
            {/* User row */}
            <div className="flex items-center gap-3">
              {drink.profilePhoto ? (
                <img src={drink.profilePhoto} alt={drink.name} className="w-10 h-10 rounded-full object-cover border-2 border-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold">
                  {drink.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-white truncate">{drink.name}</div>
                <div className="text-xs text-slate-500">{timeAgo(drink.createdAt)}</div>
              </div>
              <div className="text-right">
                <span className="text-lg font-black text-amber-400">+{drink.points}</span>
                <div className="text-[10px] text-slate-500">pts</div>
              </div>
            </div>

            {/* Drink type + location */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm bg-slate-800 px-3 py-1 rounded-full">
                {drink.quantity > 1 ? `${drink.quantity}x ` : ''}{DRINK_EMOJI[drink.drinkType]} {DRINK_LABEL[drink.drinkType]}
              </span>
              {drink.location && (
                <span className="text-sm text-slate-400">📍 {drink.location}</span>
              )}
            </div>

            {/* Caption */}
            {drink.description && (
              <p className="text-sm text-slate-300">{drink.description}</p>
            )}

            {/* Like + stats bar */}
            <div className="flex items-center gap-4 py-2 border-t border-b border-white/5">
              <button
                onClick={toggleLike}
                className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                  isLiked ? 'text-amber-400' : 'text-slate-400 hover:text-amber-400'
                }`}
              >
                <span className="text-lg">{isLiked ? '❤️' : '🤍'}</span>
                <span>{likes.length > 0 ? `${likes.length} like${likes.length !== 1 ? 's' : ''}` : 'Like'}</span>
              </button>

              <span className="text-sm text-slate-500">
                💬 {comments.length} comment{comments.length !== 1 ? 's' : ''}
              </span>

              {isOwner && (
                <button
                  onClick={handleDelete}
                  className="ml-auto text-xs text-slate-500 hover:text-red-400 transition-colors"
                >
                  🗑️ Delete
                </button>
              )}
            </div>

            {/* Comments */}
            <div className="space-y-2">
              {comments.length === 0 && (
                <p className="text-xs text-slate-500">No comments yet — be the first!</p>
              )}
              {comments.map((c, i) => (
                <div key={`${c.userId}_${c.at}_${i}`} className="flex gap-2">
                  <span className="text-xs font-bold text-amber-400 flex-shrink-0">{c.name}</span>
                  <span className="text-xs text-slate-300">{c.text}</span>
                </div>
              ))}

              {/* Comment input */}
              <form onSubmit={postComment} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  maxLength={200}
                  className="flex-1 bg-slate-800 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || posting}
                  className="px-3 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40"
                >
                  Post
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-white/5">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
