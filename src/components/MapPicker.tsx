import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef } from 'react'

export function MapPicker({
  lat,
  lng,
  onChange,
  height = 360,
}: {
  lat: number | null
  lng: number | null
  onChange: (lat: number, lng: number) => void
  height?: number
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const onChangeRef = useRef(onChange)
  const lastCenterRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => { onChangeRef.current = onChange }, [onChange])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const fallbackLat = lat ?? -23.5505
    const fallbackLng = lng ?? -46.6333
    const initialZoom = lat ? 16 : 12

    const map = L.map(containerRef.current, { zoomControl: false, attributionControl: false }).setView(
      [fallbackLat, fallbackLng],
      initialZoom
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    lastCenterRef.current = { lat: fallbackLat, lng: fallbackLng }
    onChangeRef.current(fallbackLat, fallbackLng)

    map.on('moveend', () => {
      const c = map.getCenter()
      lastCenterRef.current = { lat: c.lat, lng: c.lng }
      onChangeRef.current(c.lat, c.lng)
    })

    mapRef.current = map

    if (lat === null && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mapRef.current) return
          const { latitude, longitude } = pos.coords
          lastCenterRef.current = { lat: latitude, lng: longitude }
          mapRef.current.setView([latitude, longitude], 16)
          onChangeRef.current(latitude, longitude)
        },
        () => {},
        { timeout: 6000 }
      )
    }

    return () => { map.remove(); mapRef.current = null }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return
    const last = lastCenterRef.current
    if (last && Math.abs(last.lat - lat) < 0.00001 && Math.abs(last.lng - lng) < 0.00001) return
    lastCenterRef.current = { lat, lng }
    mapRef.current.setView([lat, lng], 16)
  }, [lat, lng])

  return (
    <div className="relative">
      <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-2xl border border-ink-100" />
      <div
        className="pointer-events-none absolute"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -100%)', zIndex: 9999, width: 26, height: 26 }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#ea1d2c',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
            border: '3px solid white',
            boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          }}
        />
      </div>
      <div
        className="pointer-events-none absolute rounded-full bg-white border-2 border-[#ea1d2c]"
        style={{ left: '50%', top: '50%', width: 8, height: 8, transform: 'translate(-50%, -50%)', zIndex: 9999 }}
      />
      <p className="mt-1.5 text-[11px] text-ink-400">
        {lat !== null && lng !== null
          ? `${lat.toFixed(5)}, ${lng.toFixed(5)} — mova o mapa para ajustar`
          : 'Mova o mapa para posicionar o pino da loja'}
      </p>
    </div>
  )
}
