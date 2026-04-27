// Returns local hour (0–23) from a Firestore timestamp or Date
function localHour(timestamp) {
  if (!timestamp) return -1
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
  return date.getHours()
}

// Returns epoch ms from a Firestore timestamp or Date
function toMs(timestamp) {
  if (!timestamp) return 0
  return (timestamp.toDate ? timestamp.toDate() : new Date(timestamp)).getTime()
}

// Get unique day strings from drinks
function getDays(allDrinks) {
  return [...new Set(allDrinks.map(d => d.day).filter(Boolean))].sort()
}

// Returns the ranked userId array for a given day
function rankForDay(day, allDrinks) {
  const totals = {}
  allDrinks.filter(d => d.day === day).forEach(d => {
    totals[d.userId] = (totals[d.userId] || 0) + d.points
  })
  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .map(([uid]) => uid)
}

// Badge definitions — Notre Dame Football Edition ☘️
const BADGE_DEFS = [
  // ── Legendary tier ──
  {
    id: 'touchdown_jesus',
    emoji: '✝️',
    label: 'Touchdown Jesus',
    description: '#1 overall for the day — arms raised, untouchable',
    check(userId, userDrinks, allDrinks) {
      const days = getDays(allDrinks)
      return days.some(day => {
        const ranked = rankForDay(day, allDrinks)
        return ranked.length > 0 && ranked[0] === userId
      })
    },
  },
  {
    id: 'play_like_a_champion',
    emoji: '🏆',
    label: 'Play Like a Champion Today',
    description: '20+ total points — you tapped the sign and meant it',
    check(userId, userDrinks) {
      const total = userDrinks.reduce((sum, d) => sum + d.points, 0)
      return total >= 20
    },
  },
  {
    id: 'four_horsemen',
    emoji: '🐴',
    label: 'The Four Horsemen',
    description: '4 drinks in 4 consecutive hours — the original wrecking crew',
    check(userId, userDrinks) {
      const times = userDrinks.map(d => toMs(d.createdAt)).filter(t => t > 0).sort((a, b) => a - b)
      const WINDOW = 4 * 60 * 60 * 1000
      for (let i = 0; i <= times.length - 4; i++) {
        if (times[i + 3] - times[i] <= WINDOW) return true
      }
      return false
    },
  },
  {
    id: 'win_one_for_the_gipper',
    emoji: '🫡',
    label: 'Win One for the Gipper',
    description: 'Wingman assist — sacrificed your night for the boys',
    check(userId, userDrinks) {
      return userDrinks.some(d => d.drinkType === 'wingman')
    },
  },
  {
    id: 'rudy',
    emoji: '☘️',
    label: 'Rudy! Rudy! Rudy!',
    description: 'Came from behind — moved up 2+ spots in an hour',
    check(userId, userDrinks, allDrinks) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const days = getDays(allDrinks)
      return days.some(day => {
        const dayDrinks = allDrinks.filter(d => d.day === day)
        if (!dayDrinks.length) return false
        const currentRanked = rankForDay(day, allDrinks)
        const currentRank = currentRanked.indexOf(userId)
        if (currentRank === -1) return false
        const oldTotals = {}
        dayDrinks.forEach(d => {
          if (toMs(d.createdAt) < oneHourAgo) {
            oldTotals[d.userId] = (oldTotals[d.userId] || 0) + d.points
          }
        })
        const oldRanked = Object.entries(oldTotals).sort((a, b) => b[1] - a[1]).map(([uid]) => uid)
        const oldRank = oldRanked.indexOf(userId)
        if (oldRank === -1) return false
        return (oldRank - currentRank) >= 2
      })
    },
  },

  // ── Bonus reps ──
  {
    id: 'the_leprechaun',
    emoji: '💋',
    label: 'The Leprechaun',
    description: 'Dance floor makeout — got lucky, Irish-style',
    check(userId, userDrinks) {
      return userDrinks.some(d => d.drinkType === 'makeout')
    },
  },
  {
    id: 'golden_dome',
    emoji: '🐣',
    label: 'Under the Golden Dome',
    description: 'Brought a bird home — the golden dome shines tonight',
    check(userId, userDrinks) {
      return userDrinks.some(d => d.drinkType === 'bird')
    },
  },

  // ── Game-day drinking ──
  {
    id: 'notre_dame_stadium',
    emoji: '🏟️',
    label: 'The House That Rockne Built',
    description: 'First drink logged on any day — opened the stadium',
    check(userId, userDrinks, allDrinks) {
      const days = getDays(allDrinks)
      return days.some(day => {
        const dayDrinks = allDrinks.filter(d => d.day === day)
        if (!dayDrinks.length) return false
        const sorted = [...dayDrinks].sort((a, b) => toMs(a.createdAt) - toMs(b.createdAt))
        return sorted[0].userId === userId
      })
    },
  },
  {
    id: 'no_huddle',
    emoji: '💥',
    label: 'No Huddle Offense',
    description: '3 drinks within 30 minutes — tempo, tempo, tempo',
    check(userId, userDrinks) {
      const times = userDrinks.map(d => toMs(d.createdAt)).filter(t => t > 0).sort((a, b) => a - b)
      const WINDOW = 30 * 60 * 1000
      for (let i = 0; i <= times.length - 3; i++) {
        if (times[i + 2] - times[i] <= WINDOW) return true
      }
      return false
    },
  },
  {
    id: 'knute_rockne',
    emoji: '🎩',
    label: 'Knute Rockne',
    description: '3+ drinks in a day — a legendary game plan',
    check(userId, userDrinks) {
      const byDay = {}
      userDrinks.forEach(d => { byDay[d.day] = (byDay[d.day] || 0) + 1 })
      return Object.values(byDay).some(c => c >= 3)
    },
  },
  {
    id: 'irish_guard',
    emoji: '🌇',
    label: 'Irish Guard',
    description: 'Drink during golden hour (5–7pm) — standing tall at sunset',
    check(userId, userDrinks) {
      return userDrinks.some(d => {
        const h = localHour(d.createdAt)
        return h >= 17 && h < 19
      })
    },
  },
  {
    id: 'overtime',
    emoji: '🌙',
    label: 'Overtime',
    description: 'Still going between midnight and 5am — the game ain\'t over',
    check(userId, userDrinks) {
      return userDrinks.some(d => {
        const h = localHour(d.createdAt)
        return h >= 0 && h < 5
      })
    },
  },
  {
    id: 'targeting',
    emoji: '🥴',
    label: 'Targeting (Ejection Pending)',
    description: '4+ drinks between midnight and 5am — under review by the booth',
    check(userId, userDrinks) {
      const lateNight = userDrinks.filter(d => {
        const h = localHour(d.createdAt)
        return h >= 0 && h < 5
      })
      return lateNight.length >= 4
    },
  },
  {
    id: 'walk_on',
    emoji: '📸',
    label: 'Walk-On',
    description: 'Logged your first drink — you made the roster',
    check(userId, userDrinks) {
      return userDrinks.some(d => d.imageUrl && d.imageUrl.length > 0)
    },
  },
  {
    id: 'five_star',
    emoji: '⭐',
    label: '5-Star Recruit',
    description: '5+ drinks in a single day — top prospect in the nation',
    check(userId, userDrinks) {
      const byDay = {}
      userDrinks.forEach(d => { byDay[d.day] = (byDay[d.day] || 0) + 1 })
      return Object.values(byDay).some(c => c >= 5)
    },
  },
  {
    id: 'the_shirt',
    emoji: '👕',
    label: 'The Shirt',
    description: '10+ total points — you\'re officially part of the gameday tradition',
    check(userId, userDrinks) {
      const total = userDrinks.reduce((sum, d) => sum + d.points, 0)
      return total >= 10
    },
  },
]

/**
 * Returns earned badges for a user.
 * @param {string} userId
 * @param {Array}  allDrinks  — full drinks array from Firestore
 * @returns {Array<{ id, emoji, label, description }>} — only earned badges, sorted by priority
 */
export function getBadges(userId, allDrinks) {
  const userDrinks = allDrinks.filter(d => d.userId === userId)
  if (!userDrinks.length) return []

  return BADGE_DEFS.filter(def => def.check(userId, userDrinks, allDrinks))
    .map(({ id, emoji, label, description }) => ({ id, emoji, label, description }))
}
