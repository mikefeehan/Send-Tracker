import { useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const DEFAULT_CENTER = [20, 0]
const DEFAULT_ZOOM = 2

// Sanitize text to prevent XSS in popup/icon HTML
function safe(str) {
  return String(str || '').replace(/[<>"'&]/g, c =>
    ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' }[c])
  )
}

// Build a custom divIcon using the user's profile photo (or initial fallback)
function createProfileMarker(drink) {
  const initial = (drink.name || '?').charAt(0).toUpperCase()

  const avatar = drink.profilePhoto
    ? `<img
        src="${safe(drink.profilePhoto)}"
        style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block"
        onerror="this.style.display='none';this.parentNode.innerHTML='<span style=&quot;font-weight:700;font-size:14px;color:white&quot;>${safe(initial)}</span>'"
      />`
    : `<span style="font-weight:700;font-size:14px;color:white">${safe(initial)}</span>`

  const html = `
    <div style="display:flex;flex-direction:column;align-items:center;filter:drop-shadow(0 3px 8px rgba(0,0,0,0.45))">
      <div style="
        width:40px;height:40px;
        border-radius:50%;
        border:2.5px solid white;
        overflow:hidden;
        background:linear-gradient(135deg,#f43f5e,#a855f7);
        display:flex;align-items:center;justify-content:center;
        flex-shrink:0;
      ">
        ${avatar}
      </div>
      <div style="
        width:0;height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:8px solid white;
        margin-top:-1px;
      "></div>
    </div>
  `

  return L.divIcon({
    html,
    className: '',
    iconSize: [40, 50],
    iconAnchor: [20, 50],
    popupAnchor: [0, -54],
  })
}

export default function MapView({ drinks }) {
  const mapRef = useRef(null)
  const instanceRef = useRef(null)

  const drinksWithCoords = drinks.filter(d => d.lat && d.lng)

  useEffect(() => {
    if (!mapRef.current) return

    if (instanceRef.current) {
      instanceRef.current.remove()
      instanceRef.current = null
    }

    const map = L.map(mapRef.current).setView(DEFAULT_CENTER, DEFAULT_ZOOM)
    instanceRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(map)

    const markers = []
    drinksWithCoords.forEach(drink => {
      const marker = L.marker([drink.lat, drink.lng], {
        icon: createProfileMarker(drink),
      }).addTo(map)

      marker.bindPopup(`
        <div style="text-align:center;min-width:110px">
          <img
            src="${safe(drink.imageUrl)}"
            style="width:110px;height:75px;object-fit:cover;border-radius:8px;margin-bottom:6px;display:block"
            onerror="this.style.display='none'"
          />
          <div style="font-weight:700;font-size:13px">${safe(drink.name)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">${safe(drink.location)}</div>
        </div>
      `)
      markers.push(marker)
    })

    if (markers.length === 1) {
      map.setView([drinksWithCoords[0].lat, drinksWithCoords[0].lng], 14)
    } else if (markers.length > 1) {
      const group = L.featureGroup(markers)
      map.fitBounds(group.getBounds().pad(0.25))
    } else {
      // No markers — try to center on user's location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => {
            map.setView([pos.coords.latitude, pos.coords.longitude], 12)
          },
          () => {} // Keep default world view on error
        )
      }
    }

    return () => {
      map.remove()
      instanceRef.current = null
    }
  }, [drinksWithCoords.map(d => d.id).join(',')])

  if (drinksWithCoords.length === 0) {
    return (
      <div className="text-center py-14" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 1px 2px rgba(0,0,0,0.6)' }}>
        <div className="text-6xl mb-4">🗺️</div>
        <p className="text-white text-lg font-bold">No location data yet</p>
        <p className="text-slate-200 text-base mt-2">Tap 📍 when submitting a drink to pin it on the map</p>
      </div>
    )
  }

  return (
    <div>
      <div ref={mapRef} style={{ height: '420px', borderRadius: '16px', overflow: 'hidden' }} />
      <p className="text-xs text-slate-500 text-center mt-2">
        {drinksWithCoords.length} drink{drinksWithCoords.length !== 1 ? 's' : ''} pinned · tap a marker for details
      </p>
    </div>
  )
}
