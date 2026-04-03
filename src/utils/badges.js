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

// Build { [day]: pointsTotal } for a userId from allDrinks
function pointsByDay(userId, allDrinks) {
  const map = {}
  allDrinks.forEach(d => {
    if (d.userId === userId) map[d.day] = (map[d.day] || 0) + d.points
  })
  return map
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

// Badge definitions — evaluated in priority order (highest first)
const BADGE_DEFS = [
  {
    id: 'king_of_day',
    emoji: '👑',
    label: 'King of the Day',
    description: 'Ranked #1 for the day',
    check(userId, userDrinks, allDrinks) {
      const days = getDays(allDrinks)
      return days.some(day => {
        const ranked = rankForDay(day, allDrinks)
        return ranked.length > 0 && ranked[0] === userId
      })
    },
  },
  {
    id: 'on_a_heater',
    emoji: '🚀',
    label: 'On a Heater',
    description: '5+ drinks in a single day',
    check(userId, userDrinks) {
      const byDay = {}
      userDrinks.forEach(d => { byDay[d.day] = (byDay[d.day] || 0) + 1 })
      return Object.values(byDay).some(c => c >= 5)
    },
  },
  {
    id: 'questionable_decisions',
    emoji: '🥴',
    label: 'Questionable Decisions',
    description: '4+ drinks between midnight and 5am',
    check(userId, userDrinks) {
      const lateNight = userDrinks.filter(d => {
        const h = localHour(d.createdAt)
        return h >= 0 && h < 5
      })
      return lateNight.length >= 4
    },
  },
  {
    id: 'send_it',
    emoji: '💥',
    label: 'Send It',
    description: '3 drinks within a 30-minute window',
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
    id: 'hat_trick',
    emoji: '🎩',
    label: 'Hat Trick',
    description: '3+ drinks in a single day',
    check(userId, userDrinks) {
      const byDay = {}
      userDrinks.forEach(d => { byDay[d.day] = (byDay[d.day] || 0) + 1 })
      return Object.values(byDay).some(c => c >= 3)
    },
  },
  {
    id: 'climber',
    emoji: '📈',
    label: 'Climber',
    description: 'Moved up 2+ spots in the last hour',
    check(userId, userDrinks, allDrinks) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const days = getDays(allDrinks)
      return days.some(day => {
        const dayDrinks = allDrinks.filter(d => d.day === day)
        if (!dayDrinks.length) return false

        // Current rank
        const currentRanked = rankForDay(day, allDrinks)
        const currentRank = currentRanked.indexOf(userId)
        if (currentRank === -1) return false

        // Rank 1hr ago (exclude recent drinks)
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
  {
    id: 'first_blood',
    emoji: '🩸',
    label: 'First Blood',
    description: 'First drink logged on any event day',
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
    id: 'proof',
    emoji: '📸',
    label: 'Proof or It Didn\'t Happen',
    description: 'Logged a drink with a photo',
    check(userId, userDrinks) {
      return userDrinks.some(d => d.imageUrl && d.imageUrl.length > 0)
    },
  },
  {
    id: 'golden_hour',
    emoji: '🌇',
    label: 'Golden Hour',
    description: 'Drink logged between 5pm and 7pm',
    check(userId, userDrinks) {
      return userDrinks.some(d => {
        const h = localHour(d.createdAt)
        return h >= 17 && h < 19
      })
    },
  },
  {
    id: 'night_owl',
    emoji: '🦉',
    label: 'Night Owl',
    description: 'Drink logged between midnight and 5am',
    check(userId, userDrinks) {
      return userDrinks.some(d => {
        const h = localHour(d.createdAt)
        return h >= 0 && h < 5
      })
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
