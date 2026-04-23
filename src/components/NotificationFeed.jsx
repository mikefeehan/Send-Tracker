// In-app notification feed — shows likes + comments on the current user's drinks

function timeAgo(timestamp) {
  if (!timestamp) return ''
  const ms = typeof timestamp === 'number' ? timestamp : (timestamp.toDate ? timestamp.toDate().getTime() : new Date(timestamp).getTime())
  const diff = Math.floor((Date.now() - ms) / 1000)
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function getNotifications(userId, drinks, allUsers) {
  const notifications = []
  const userMap = {}
  allUsers.forEach(u => { userMap[u.userId] = u })

  // Only look at the current user's drinks
  const myDrinks = drinks.filter(d => d.userId === userId)

  myDrinks.forEach(drink => {
    // Likes from other people
    ;(drink.likes || []).forEach(likerUid => {
      if (likerUid === userId) return
      const liker = userMap[likerUid]
      notifications.push({
        id: `like_${drink.id}_${likerUid}`,
        type: 'like',
        drinkId: drink.id,
        drink,
        fromName: liker?.name || 'Someone',
        fromPhoto: liker?.profilePhoto || '',
        // Approximate time: use the drink's createdAt as a baseline (we don't store like timestamps)
        // This means likes show up sorted by the drink, not the like time — good enough
        time: drink.createdAt,
        text: 'liked your drink',
      })
    })

    // Comments from other people
    ;(drink.comments || []).forEach(comment => {
      if (comment.userId === userId) return
      notifications.push({
        id: `comment_${drink.id}_${comment.userId}_${comment.at}`,
        type: 'comment',
        drinkId: drink.id,
        drink,
        fromName: comment.name || 'Someone',
        fromPhoto: userMap[comment.userId]?.profilePhoto || '',
        time: comment.at, // epoch ms
        text: comment.text,
      })
    })
  })

  // Sort newest first
  notifications.sort((a, b) => {
    const aMs = typeof a.time === 'number' ? a.time : (a.time?.toDate ? a.time.toDate().getTime() : 0)
    const bMs = typeof b.time === 'number' ? b.time : (b.time?.toDate ? b.time.toDate().getTime() : 0)
    return bMs - aMs
  })

  return notifications
}

export default function NotificationFeed({ notifications, onClose, onOpenDrink }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />
      <div
        className="relative rounded-t-3xl max-h-[85vh] flex flex-col"
        style={{ background: 'rgba(10,15,25,0.92)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.09)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-4 pt-2 pb-3">
          <h2 className="text-xl font-black text-white text-center">Notifications</h2>
        </div>

        <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-1.5">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">🔔</div>
              <p className="text-white font-semibold">No notifications yet</p>
              <p className="text-slate-400 text-sm mt-1">Likes and comments on your drinks will show up here</p>
            </div>
          ) : (
            notifications.slice(0, 50).map(n => (
              <button
                key={n.id}
                onClick={() => onOpenDrink(n.drink)}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors hover:bg-white/5 active:bg-white/10"
              >
                {/* Avatar */}
                {n.fromPhoto ? (
                  <img src={n.fromPhoto} alt="" className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {n.fromName.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white">
                    <span className="font-bold">{n.fromName}</span>
                    {' '}
                    {n.type === 'like' ? (
                      <span className="text-slate-400">liked your drink ❤️</span>
                    ) : (
                      <>
                        <span className="text-slate-400">commented: </span>
                        <span className="text-slate-300">"{n.text.length > 40 ? n.text.slice(0, 40) + '...' : n.text}"</span>
                      </>
                    )}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{timeAgo(n.time)}</p>
                </div>

                {/* Drink thumbnail */}
                {n.drink?.imageUrl && (
                  <img src={n.drink.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
              </button>
            ))
          )}
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
