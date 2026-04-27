const DRINK_EMOJI = { beer: '🍺', wine: '🍺', shot: '🥃', cocktail: '🍸', shotgun: '🔫', birdie: '🦅', mulligan: '⛳', makeout: '💋', bird: '🐣', wingman: '🤝' }
const DRINK_LABEL = { beer: 'Beer/Seltzer/Wine', wine: 'Beer/Seltzer/Wine', shot: 'Shot', cocktail: 'Cocktail', shotgun: 'Beer Shotgun', birdie: 'Birdie or Better', mulligan: 'Mulligan', makeout: 'Dance Floor Makeout', bird: 'Brought a Bird Home', wingman: 'Wingman Assist' }

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA')
}

function formatDayLabel(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function RecapModal({ filter, drinks: rawDrinks, onClose }) {
  const drinks = rawDrinks.filter(d => d.userId !== 'ADMIN')
  const todayStr = getTodayStr()

  const isToday = filter === 'today'
  const filteredDrinks = isToday ? drinks.filter(d => d.day === todayStr) : drinks
  const title = isToday ? `Today's Recap` : 'Event Recap'
  const subtitle = isToday ? formatDayLabel(todayStr) : 'Full event stats'

  if (filteredDrinks.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-slate-900 border border-slate-700 rounded-2xl p-6 text-center max-w-sm w-full">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-slate-400">No data yet{isToday ? ' for today' : ''}.</p>
          <button onClick={onClose} className="mt-4 px-6 py-2 bg-slate-800 rounded-xl text-slate-300 text-sm">Close</button>
        </div>
      </div>
    )
  }

  // Stats
  const totalDrinks = filteredDrinks.length
  const totalPoints = filteredDrinks.reduce((s, d) => s + d.points, 0)

  const userMap = {}
  filteredDrinks.forEach(d => {
    userMap[d.userId] = userMap[d.userId] || { name: d.name, points: 0, drinks: 0 }
    userMap[d.userId].points += d.points
    userMap[d.userId].drinks += 1
  })
  const ranked = Object.values(userMap).sort((a, b) => b.points - a.points)
  const topSender = ranked[0]

  const locationCount = {}
  filteredDrinks.forEach(d => {
    if (d.location) locationCount[d.location] = (locationCount[d.location] || 0) + 1
  })
  const topLocation = Object.entries(locationCount).sort((a, b) => b[1] - a[1])[0]

  const drinkCount = {}
  filteredDrinks.forEach(d => { drinkCount[d.drinkType] = (drinkCount[d.drinkType] || 0) + 1 })

  const mostLiked = [...filteredDrinks].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0))[0]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative rounded-t-3xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        style={{ background: 'rgba(10,15,25,0.82)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderTop: '1px solid rgba(255,255,255,0.09)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        <div className="px-5 pb-6 pt-2 space-y-5">
          {/* Title */}
          <div className="text-center">
            <div className="text-4xl mb-1">📊</div>
            <h2 className="text-2xl font-black text-white">{title}</h2>
            <p className="text-slate-400 text-sm">{subtitle}</p>
          </div>

          {/* Big stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-3xl font-black text-white">{totalDrinks}</div>
              <div className="text-xs text-slate-400 mt-0.5">Drinks</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-3xl font-black text-amber-400">{totalPoints}</div>
              <div className="text-xs text-slate-400 mt-0.5">Total pts</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-3 text-center">
              <div className="text-3xl font-black text-white">{ranked.length}</div>
              <div className="text-xs text-slate-400 mt-0.5">Senders</div>
            </div>
          </div>

          {/* Top sender */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
            <span className="text-3xl">👑</span>
            <div>
              <div className="text-xs text-yellow-400 font-semibold">TOP SENDER</div>
              <div className="text-lg font-black text-white">{topSender.name}</div>
              <div className="text-sm text-yellow-300">{topSender.points} pts · {topSender.drinks} drinks</div>
            </div>
          </div>

          {/* Drink breakdown */}
          <div className="bg-slate-800 rounded-xl p-4">
            <div className="text-xs text-slate-400 font-semibold mb-3">DRINK BREAKDOWN</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(drinkCount).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-xl">{DRINK_EMOJI[type]}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{DRINK_LABEL[type] || type}</div>
                    <div className="text-xs text-slate-400">{count} logged</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top location */}
          {topLocation && (
            <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">📍</span>
              <div>
                <div className="text-xs text-slate-400 font-semibold">HOTTEST SPOT</div>
                <div className="text-base font-bold text-white">{topLocation[0]}</div>
                <div className="text-xs text-slate-400">{topLocation[1]} drink{topLocation[1] !== 1 ? 's' : ''} logged here</div>
              </div>
            </div>
          )}

          {/* Most liked */}
          {mostLiked && mostLiked.likes?.length > 0 && (
            <div className="bg-amber-600/10 border border-amber-600/20 rounded-xl overflow-hidden">
              <img src={mostLiked.imageUrl} alt="most liked" className="w-full aspect-video object-cover" />
              <div className="p-3">
                <div className="text-xs text-amber-400 font-semibold">MOST LIKED ❤️ {mostLiked.likes.length}</div>
                <div className="text-sm font-bold text-white mt-0.5">{mostLiked.name}</div>
                {mostLiked.description && <p className="text-xs text-slate-400 mt-0.5">{mostLiked.description}</p>}
              </div>
            </div>
          )}

          {/* Full leaderboard */}
          <div>
            <div className="text-xs text-slate-400 font-semibold mb-2">{isToday ? "TODAY'S" : 'EVENT'} STANDINGS</div>
            <div className="space-y-2">
              {ranked.map((u, i) => (
                <div key={u.name} className="flex items-center gap-3 bg-slate-800 rounded-xl px-3 py-2">
                  <span className="text-sm font-bold text-slate-400 w-5">#{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold text-white">{u.name}</span>
                  <span className="text-sm font-black text-amber-400">{u.points} pts</span>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-800 rounded-xl text-slate-300 font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
