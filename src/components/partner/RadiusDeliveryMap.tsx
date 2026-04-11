import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Loader2, LocateFixed, Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

export type RadiusZone = {
  id: string
  radiusKm: number
  fee: number
  color: string
}

const ZONE_COLORS = ['#ea1d2c', '#f97316', '#eab308']

const RADIUS_OPTIONS = [1, 2, 3, 4, 5, 7, 10, 12, 15, 20, 25, 30]

function formatCurrencyInput(value: string) {
  const digitsOnly = value.replace(/\D/g, '')

  if (!digitsOnly) {
    return ''
  }

  return (Number(digitsOnly) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function parseCurrencyInput(value: string) {
  const normalizedValue = value.replace(/\./g, '').replace(',', '.').trim()

  if (!normalizedValue) {
    return 0
  }

  const parsedValue = Number(normalizedValue)
  return Number.isFinite(parsedValue) ? parsedValue : 0
}

function formatCurrencyValue(value: number) {
  if (value <= 0) {
    return ''
  }

  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function RadiusDeliveryMap({
  lat,
  lng,
  zones,
  onZonesChange,
  onLocationChange,
}: {
  lat: number | null
  lng: number | null
  zones: RadiusZone[]
  onZonesChange: (zones: RadiusZone[]) => void
  onLocationChange: (lat: number, lng: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const circlesRef = useRef<L.Circle[]>([])
  const onLocationRef = useRef(onLocationChange)
  const zonesRef = useRef(zones)
  const [locating, setLocating] = useState(false)

  useEffect(() => { onLocationRef.current = onLocationChange }, [onLocationChange])
  useEffect(() => { zonesRef.current = zones }, [zones])

  function goToMyLocation() {
    if (!navigator.geolocation || !mapRef.current) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        mapRef.current?.setView([latitude, longitude], 14, { animate: true })
        onLocationRef.current(latitude, longitude)
        setLocating(false)
      },
      () => setLocating(false),
      { timeout: 8000 }
    )
  }

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const fallbackLat = lat ?? -23.5505
    const fallbackLng = lng ?? -46.6333

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      boxZoom: false,
      keyboard: false,
      dragging: false,
    }).setView([fallbackLat, fallbackLng], lat ? 13 : 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map)

    map.on('moveend', () => {
      const c = map.getCenter()
      onLocationRef.current(c.lat, c.lng)
    })

    mapRef.current = map

    if (lat === null && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!mapRef.current) return
          mapRef.current.setView([pos.coords.latitude, pos.coords.longitude], 13)
          onLocationRef.current(pos.coords.latitude, pos.coords.longitude)
        },
        () => {},
        { timeout: 6000 }
      )
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update circles when zones or location change
  useEffect(() => {
    if (!mapRef.current) return

    circlesRef.current.forEach((c) => c.remove())
    circlesRef.current = []

    const center: [number, number] = [lat ?? -23.5505, lng ?? -46.6333]

    // Draw largest first (background)
    const sorted = [...zones].sort((a, b) => b.radiusKm - a.radiusKm)

    sorted.forEach((zone) => {
      const circle = L.circle(center, {
        radius: zone.radiusKm * 1000,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '6 4',
      }).addTo(mapRef.current!)
      circlesRef.current.push(circle)
    })

    // Fit map to largest circle if zones exist
    if (zones.length > 0) {
      const maxKm = Math.max(...zones.map((z) => z.radiusKm))
      const bounds = L.latLng(center).toBounds(maxKm * 1000 * 2.2)
      mapRef.current.fitBounds(bounds, { animate: false })
    }
  }, [zones, lat, lng])

  function addZone() {
    if (zones.length >= 3) return
    const nextRadii = RADIUS_OPTIONS.filter((r) => !zones.some((z) => z.radiusKm === r))
    const nextRadius = nextRadii[zones.length] ?? nextRadii[0] ?? 5
    onZonesChange([
      ...zones,
      {
        id: crypto.randomUUID(),
        radiusKm: nextRadius,
        fee: 0,
        color: ZONE_COLORS[zones.length] ?? '#ea1d2c',
      },
    ])
  }

  function updateZone(id: string, patch: Partial<RadiusZone>) {
    onZonesChange(zones.map((z) => (z.id === id ? { ...z, ...patch } : z)))
  }

  function removeZone(id: string) {
    onZonesChange(zones.filter((z) => z.id !== id))
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
      <div className="relative overflow-hidden rounded-2xl border border-ink-100" style={{ height: 420 }}>
        <div ref={containerRef} className="h-full w-full" />
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
        <button
          type="button"
          onClick={goToMyLocation}
          disabled={locating}
          className="absolute right-3 top-3 z-[9999] flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[12px] font-semibold text-ink-700 shadow-md transition hover:bg-ink-50 disabled:opacity-70"
        >
          {locating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LocateFixed className="h-3.5 w-3.5 text-[#ea1d2c]" />}
          Minha localizacao
        </button>

        <p className="absolute bottom-2 left-3 z-[9999] rounded-xl bg-white/80 px-2.5 py-1 text-[11px] text-ink-400 backdrop-blur-sm">
          Use "Minha localizacao" para centralizar o mapa
        </p>
      </div>

      <div className="space-y-3 xl:max-h-[420px] xl:overflow-y-auto xl:pr-1">
        {zones.map((zone, index) => (
          <div
            key={zone.id}
            className="rounded-2xl border p-4"
            style={{ borderColor: zone.color + '55', backgroundColor: zone.color + '08' }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white text-[12px] font-bold"
                  style={{ backgroundColor: zone.color }}
                >
                  {index + 1}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink-900">Zona {index + 1}</p>
                  <p className="text-xs text-ink-500">{formatCurrency(zone.fee || 0)}</p>
                </div>
              </div>

              {zones.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeZone(zone.id)}
                  className="rounded-xl p-2 text-ink-400 transition hover:bg-coral-50 hover:text-coral-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3">
              <div>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    Raio de entrega
                  </span>
                  <select
                    value={zone.radiusKm}
                    onChange={(e) => updateZone(zone.id, { radiusKm: Number(e.target.value) })}
                    className="h-11 w-full rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-900 outline-none focus:border-[#ea1d2c]"
                  >
                    {RADIUS_OPTIONS.map((r) => (
                      <option key={r} value={r}>{r} km</option>
                    ))}
                  </select>
                </label>
              </div>

              <div>
                <label className="block">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-500">
                    Taxa de entrega
                  </span>
                  <div className="flex h-11 items-center rounded-xl border border-ink-200 bg-white px-3 focus-within:border-[#ea1d2c]">
                    <span className="shrink-0 text-[13px] font-semibold text-ink-500">R$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatCurrencyValue(zone.fee)}
                      onChange={(e) => {
                        const formattedValue = formatCurrencyInput(e.target.value)
                        updateZone(zone.id, { fee: parseCurrencyInput(formattedValue) })
                      }}
                      className="h-full w-full bg-transparent px-2 text-[13px] font-semibold text-ink-900 outline-none"
                      placeholder="0,00"
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        ))}

        {zones.length < 3 && (
          <button
            type="button"
            onClick={addZone}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-ink-200 py-3 text-[13px] font-semibold text-ink-500 transition hover:border-[#ea1d2c] hover:text-[#ea1d2c]"
          >
            <Plus className="h-4 w-4" />
            Adicionar outro raio de entrega
          </button>
        )}
      </div>
    </div>
  )
}
