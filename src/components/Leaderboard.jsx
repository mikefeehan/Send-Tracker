import { getBadges } from '../utils/badges'

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA')
}

export default function Leaderboard({ drinks: rawDrinks, selectedFilter, onUserClick }) {
  const drinks = rawDrinks.filter(d => d.userId !== 'ADMIN')
  const todayStr = getTodayStr()

  const filtered = selectedFilter === 'today'
    ? drinks.filter(d => d.day === todayStr)
    : drinks

  // Current rankings
  const userMap = {}
  filtered.forEach(drink => {
    if (!userMap[drink.userId]) {
      userMap[drink.userId] = {
        userId: drink.userId,
        name: drink.name,
        profilePhoto: drink.profilePhoto,
        points: 0,
        drinks: 0,
      }
    }
    userMap[drink.userId].points += drink.points
    userMap[drink.userId].drinks += 1
  })
  const leaderboard = Object.values(userMap).sort((a, b) => b.points - a.points)

  // Rankings 1 hour ago
  const oneHourAgo = Date.now() - 60 * 60 * 1000
  const oldMap = {}
  filtered.forEach(drink => {
    const t = drink.createdAt?.toDate ? drink.createdAt.toDate().getTime() : 0
    if (t < oneHourAgo) oldMap[drink.userId] = (oldMap[drink.userId] || 0) + drink.points
  })
  const oldRanked = Object.entries(oldMap).sort((a, b) => b[1] - a[1]).map(([uid]) => uid)

  function getMovement(userId, currentRank) {
    const oldIdx = oldRanked.indexOf(userId)
    if (oldIdx === -1) return 'new'
    const diff = (oldIdx + 1) - currentRank
    if (diff > 0) return 'up'
    if (diff < 0) return 'down'
    return 'same'
  }

  function getLabel(points) {
    if (points <= 2)  return { text: 'On the Board',    color: 'text-slate-400' }
    if (points <= 5)  return { text: 'In the Mix',      color: 'text-blue-300' }
    if (points <= 8)  return { text: 'Heating Up',      color: 'text-orange-300' }
    if (points <= 11) return { text: 'Danger Zone',     color: 'text-red-400' }
    return                   { text: 'Absolute Menace', color: 'text-purple-300' }
  }

  const filterLabel = selectedFilter === 'today' ? 'Today' : 'all time'

  if (leaderboard.length === 0) {
    return (
      <div className="text-center py-14" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)' }}>
        <div className="text-6xl mb-4">🍻</div>
        <p className="font-bold text-white text-lg">No drinks yet for {filterLabel}</p>
        <p className="text-base mt-2 text-slate-200">Be the first to get on the board</p>
      </div>
    )
  }

  return (
    <div className="space-y-2.5">
      {leaderboard.map((user, idx) => {
        const rank      = idx + 1
        const label     = getLabel(user.points)
        const movement  = getMovement(user.userId, rank)
        const badges    = getBadges(user.userId, drinks)
        const isFirst   = rank === 1

        const rowClass = isFirst   ? 'lb-row lb-row-first'
                       : rank === 2 ? 'lb-row lb-row-second'
                       : rank === 3 ? 'lb-row lb-row-third'
                       : 'lb-row lb-row-default'

        return (
          <div
            key={user.userId}
            onClick={() => onUserClick?.(user.userId)}
            className={`flex items-center gap-3 px-4 py-3.5 cursor-pointer ${rowClass}`}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {isFirst ? (
                <span className="text-2xl">👑</span>
              ) : (
                <span className="text-base font-bold text-slate-500">#{rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className="flex-shrink-0">
              {user.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user.name}
                  className={`rounded-full object-cover border-2 ${isFirst ? 'w-11 h-11 border-amber-400/60' : 'w-10 h-10 border-white/10'}`}
                />
              ) : (
                <div className={`rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white font-bold ${isFirst ? 'w-11 h-11 text-base' : 'w-10 h-10 text-sm'}`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Name + label + badges */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`font-bold truncate ${isFirst ? 'text-white text-base' : 'text-white text-base'}`}>
                  {user.name}
                </span>
                {badges.map(b => (
                  <span key={b.label} title={b.label} className="text-sm leading-none">{b.emoji}</span>
                ))}
                {movement === 'new' && (
                  <span className="text-xs font-bold bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full tracking-wide">NEW</span>
                )}
              </div>
              <div className={`text-sm mt-0.5 ${label.color}`}>{label.text}</div>
            </div>

            {/* Movement + points */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {movement === 'up'   && <span className="text-emerald-400 text-sm font-bold">↑</span>}
              {movement === 'down' && <span className="text-red-400 text-sm font-bold">↓</span>}
              <div className="text-right">
                <div className={`font-black leading-none ${isFirst ? 'text-3xl text-shimmer-gold' : 'text-2xl text-white'}`}>
                  {user.points}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{user.drinks} drink{user.drinks !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
