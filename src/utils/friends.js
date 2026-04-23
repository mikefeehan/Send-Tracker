import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../firebase'

// Deterministic composite ID so both sides share one friendship doc
export function friendshipId(uidA, uidB) {
  return [uidA, uidB].sort().join('_')
}

export async function sendFriendRequest(fromUid, toUid) {
  if (fromUid === toUid) throw new Error("Can't friend yourself")
  const id = friendshipId(fromUid, toUid)
  await setDoc(doc(db, 'friendships', id), {
    users: [fromUid, toUid].sort(),
    status: 'pending',
    requestedBy: fromUid,
    createdAt: serverTimestamp(),
    acceptedAt: null,
  })
  return id
}

export async function acceptFriendRequest(id) {
  await updateDoc(doc(db, 'friendships', id), {
    status: 'accepted',
    acceptedAt: serverTimestamp(),
  })
}

export async function removeFriendship(id) {
  await deleteDoc(doc(db, 'friendships', id))
}

/**
 * Given the friendships array and two user IDs, returns:
 *  'none' | 'pending_sent' | 'pending_received' | 'friends'
 */
export function getFriendshipStatus(currentUid, otherUid, friendships) {
  if (currentUid === otherUid) return 'self'
  const id = friendshipId(currentUid, otherUid)
  const f = friendships.find(f => f.id === id)
  if (!f) return 'none'
  if (f.status === 'accepted') return 'friends'
  // pending
  if (f.requestedBy === currentUid) return 'pending_sent'
  return 'pending_received'
}

/**
 * Returns array of UIDs of accepted friends from the friendships array.
 */
export function getAcceptedFriendUids(currentUid, friendships) {
  return friendships
    .filter(f => f.status === 'accepted')
    .map(f => f.users.find(u => u !== currentUid))
    .filter(Boolean)
}

/**
 * Returns array of incoming pending friendship docs (where someone else requested current user).
 */
export function getIncomingRequests(currentUid, friendships) {
  return friendships.filter(f => f.status === 'pending' && f.requestedBy !== currentUid)
}
