import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

// Allowed: 3-20 chars, lowercase letters, digits, underscore, period.
const USERNAME_RE = /^[a-z0-9_.]{3,20}$/

export function normalizeUsername(raw) {
  return (raw || '').trim().toLowerCase().replace(/^@/, '')
}

export function validateUsername(username) {
  const u = normalizeUsername(username)
  if (!u) return 'Username is required'
  if (u.length < 3) return 'Username must be at least 3 characters'
  if (u.length > 20) return 'Username must be 20 characters or fewer'
  if (!USERNAME_RE.test(u)) return 'Only lowercase letters, numbers, periods, and underscores'
  if (u.startsWith('.') || u.endsWith('.')) return "Can't start or end with a period"
  return null
}

export async function isUsernameAvailable(username) {
  const u = normalizeUsername(username)
  if (!u) return false
  const snap = await getDoc(doc(db, 'usernames', u))
  return !snap.exists()
}

/**
 * Reserves a username for the given userId.
 * Throws if already taken.
 */
export async function claimUsername(username, userId) {
  const u = normalizeUsername(username)
  const err = validateUsername(u)
  if (err) throw new Error(err)

  // Check availability before write to give a friendly error
  const available = await isUsernameAvailable(u)
  if (!available) throw new Error('Username is already taken')

  await setDoc(doc(db, 'usernames', u), { userId })
  return u
}

/**
 * Releases a previously held username (used when changing username).
 */
export async function releaseUsername(username) {
  const u = normalizeUsername(username)
  if (!u) return
  try {
    await deleteDoc(doc(db, 'usernames', u))
  } catch (e) { /* ignore */ }
}
