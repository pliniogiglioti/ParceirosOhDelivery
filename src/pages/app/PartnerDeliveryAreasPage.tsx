import { Loader2, MapPin } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { RadiusDeliveryMap, type RadiusZone } from '@/components/partner/RadiusDeliveryMap'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { saveDeliveryArea, saveStore } from '@/services/partner'
import type { DeliveryArea } from '@/types'

const ZONE_COLORS = ['#ea1d2c', '#f97316', '#eab308']

function createDefaultZone(): RadiusZone {
  return {
    id: crypto.randomUUID(),
    radiusKm: 3,
    fee: 0,
    color: ZONE_COLORS[0],
  }
}

function areaToZone(area: DeliveryArea, index: number): RadiusZone {
  return {
    id: area.id || crypto.randomUUID(),
    radiusKm: Number(area.etaLabel.replace(/[^0-9.]/g, '')) || (index + 1) * 3,
    fee: area.fee,
    color: ZONE_COLORS[index] ?? ZONE_COLORS[0],
  }
}

function isDeliveryStepValid(zones: RadiusZone[]) {
  return zones.length > 0 && zones.every((zone) => zone.radiusKm > 0)
}

function serializeZones(zones: RadiusZone[]) {
  return JSON.stringify(
    zones.map((zone) => ({
      radiusKm: zone.radiusKm,
      fee: zone.fee,
    }))
  )
}

export function PartnerDeliveryAreasPage() {
  const { data } = usePartnerPageData()
  const { updateStore } = usePartnerDraftStore()
  const initialActiveAreas = data.deliveryAreas.filter((area) => area.active)
  const [mapLat, setMapLat] = useState<number | null>(data.store.lat)
  const [mapLng, setMapLng] = useState<number | null>(data.store.lng)
  const [savedLat, setSavedLat] = useState<number | null>(data.store.lat)
  const [savedLng, setSavedLng] = useState<number | null>(data.store.lng)
  const [zones, setZones] = useState<RadiusZone[]>(
    initialActiveAreas.length > 0 ? initialActiveAreas.map(areaToZone) : [createDefaultZone()]
  )
  const [savedAreas, setSavedAreas] = useState<DeliveryArea[]>(data.deliveryAreas)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const activeAreas = data.deliveryAreas.filter((area) => area.active)
    setMapLat(data.store.lat)
    setMapLng(data.store.lng)
    setSavedLat(data.store.lat)
    setSavedLng(data.store.lng)
    setZones(activeAreas.length > 0 ? activeAreas.map(areaToZone) : [createDefaultZone()])
    setSavedAreas(data.deliveryAreas)
  }, [data.deliveryAreas, data.store.id])

  const hasChanges =
    mapLat !== savedLat ||
    mapLng !== savedLng ||
    serializeZones(zones) !== serializeZones(savedAreas.filter((area) => area.active).map(areaToZone))

  async function handleSave() {
    if (!isDeliveryStepValid(zones)) {
      toast.error('Defina pelo menos um raio de entrega.')
      return
    }

    setSaving(true)

    try {
      if (mapLat !== null && mapLng !== null) {
        await saveStore(data.store.id, { lat: mapLat, lng: mapLng })
        updateStore(data.store.id, { lat: mapLat, lng: mapLng })
      }

      const currentAreas = savedAreas.filter((area) => area.active)

      const nextActiveAreas = await Promise.all(
        zones.map((zone, index) =>
          saveDeliveryArea(data.store.id, {
            id: currentAreas[index]?.id,
            name: `Zona ${index + 1}`,
            etaLabel: `${zone.radiusKm} km`,
            fee: zone.fee,
            active: true,
          })
        )
      )

      const removedAreas = currentAreas.slice(zones.length)

      const nextInactiveAreas = await Promise.all(
        removedAreas.map((area, index) =>
          saveDeliveryArea(data.store.id, {
            id: area.id,
            name: area.name || `Zona ${zones.length + index + 1}`,
            etaLabel: area.etaLabel,
            fee: area.fee,
            active: false,
          })
        )
      )

      const untouchedInactiveAreas = savedAreas.filter(
        (area) => !area.active && !removedAreas.some((removedArea) => removedArea.id === area.id)
      )

      const nextSavedAreas = [...nextActiveAreas, ...nextInactiveAreas, ...untouchedInactiveAreas]
      setSavedAreas(nextSavedAreas)
      setSavedLat(mapLat)
      setSavedLng(mapLng)
      toast.success('Areas de entrega salvas.')
    } catch {
      toast.error('Nao foi possivel salvar as areas de entrega.')
    } finally {
      setSaving(false)
    }
  }

  const activeAreasCount = savedAreas.filter((area) => area.active).length

  return (
    <SectionFrame eyebrow="Areas" title="Cobertura de entrega">
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <div className="panel-card p-5">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-semibold text-ink-900">Mapa de cobertura</p>
              <p className="mt-1 text-sm text-ink-500">
                Ajuste o ponto da loja, defina os raios de entrega e atualize as taxas da mesma forma do primeiro acesso.
              </p>
            </div>

            <RadiusDeliveryMap
              lat={mapLat}
              lng={mapLng}
              zones={zones}
              onZonesChange={setZones}
              onLocationChange={(lat, lng) => {
                setMapLat(lat)
                setMapLng(lng)
              }}
            />

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={!hasChanges || saving}
                className={[
                  'inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-8 text-sm font-semibold text-white transition',
                  hasChanges && !saving
                    ? 'bg-coral-500 hover:bg-coral-600'
                    : 'cursor-not-allowed bg-ink-200 text-ink-500',
                ].join(' ')}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar alteracoes'
                )}
              </button>
            </div>
          </div>

        </div>

        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Loja</p>
            <p className="mt-2 font-display text-base font-bold text-ink-900">{data.store.name}</p>

            <div className="mt-4 flex items-start gap-2.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-coral-500" />
              <div className="text-sm leading-relaxed text-ink-600">
                <p className="font-medium text-ink-900">{data.store.addressStreet || 'Endereco nao configurado'}</p>
                {data.store.addressNeighborhood ? <p>{data.store.addressNeighborhood}</p> : null}
                {data.store.addressCity || data.store.addressState ? (
                  <p>
                    {[data.store.addressCity, data.store.addressState].filter(Boolean).join(' - ')}
                  </p>
                ) : null}
                {data.store.addressZip ? <p className="mt-1 text-xs text-ink-400">CEP {data.store.addressZip}</p> : null}
              </div>
            </div>
          </div>

          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Cobertura</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full border-2 border-blue-400 bg-blue-100" />
              <p className="text-sm text-ink-600">Raio de entrega ativo</p>
            </div>
            <p className="mt-3 font-display text-3xl font-bold text-ink-900">
              {activeAreasCount}
              <span className="ml-1.5 text-base font-medium text-ink-400">
                / {savedAreas.length} zonas
              </span>
            </p>
            <p className="mt-1 text-xs text-ink-400">zonas salvas no momento</p>
          </div>
        </div>
      </div>
    </SectionFrame>
  )
}
