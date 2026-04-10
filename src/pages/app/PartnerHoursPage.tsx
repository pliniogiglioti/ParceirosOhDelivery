import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { formatTime } from '@/lib/utils'
import type { PartnerHour } from '@/types'
import { SectionFrame, weekDays } from '@/components/partner/PartnerUi'

function normalizeTimeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value.slice(0, 8)
}

export function PartnerHoursPage() {
  const { data } = usePartnerPageData()
  const { updateStoreHour } = usePartnerDraftStore()
  const [draftHours, setDraftHours] = useState<PartnerHour[]>(data.hours)

  useEffect(() => {
    setDraftHours(data.hours)
  }, [data.hours])

  function updateHourField(
    hourId: string,
    patch: {
      opensAt?: string
      closesAt?: string
      isClosed?: boolean
    }
  ) {
    const normalizedPatch: {
      opensAt?: string
      closesAt?: string
      isClosed?: boolean
    } = {}

    if (patch.opensAt != null) {
      normalizedPatch.opensAt = normalizeTimeValue(patch.opensAt)
    }

    if (patch.closesAt != null) {
      normalizedPatch.closesAt = normalizeTimeValue(patch.closesAt)
    }

    if (patch.isClosed != null) {
      normalizedPatch.isClosed = patch.isClosed
    }

    setDraftHours((current) =>
      current.map((hour) => (hour.id === hourId ? { ...hour, ...normalizedPatch } : hour))
    )
  }

  function handleSaveHours() {
    draftHours.forEach((hour) => {
      const originalHour = data.hours.find((item) => item.id === hour.id)
      if (!originalHour) return

      if (
        originalHour.opensAt === hour.opensAt &&
        originalHour.closesAt === hour.closesAt &&
        originalHour.isClosed === hour.isClosed
      ) {
        return
      }

      updateStoreHour(data.store.id, hour.id, {
        opensAt: hour.opensAt,
        closesAt: hour.closesAt,
        isClosed: hour.isClosed,
      })
    })

    toast.success('Horarios salvos com sucesso.')
  }

  return (
    <SectionFrame eyebrow="Horarios" title="Agenda semanal da loja">
      <div className="panel-card space-y-6 p-6">
        <div className="flex flex-col gap-3 rounded-3xl bg-ink-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">Edicao dos horarios de funcionamento</p>
            <p className="mt-1 text-sm text-ink-500">
              Ajuste os dias e horarios de atendimento da loja ao longo da semana.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveHours}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Salvar horarios
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          {draftHours.map((hour) => (
            <article
              key={hour.id}
              className={[
                'flex h-full flex-col rounded-3xl border p-4',
                hour.isClosed ? 'border-coral-200 bg-coral-50/35' : 'border-mint-300 bg-mint-100/35',
              ].join(' ')}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{weekDays[hour.weekDay] ?? `Dia ${hour.weekDay}`}</p>
                  </div>

                  <p className="mt-2 text-sm text-ink-600">
                    {hour.isClosed ? 'Fechada' : `${formatTime(hour.opensAt)} - ${formatTime(hour.closesAt)}`}
                  </p>
                </div>
              </div>

              <div className="hours-editor-panel mt-4 grid gap-3 rounded-3xl bg-ink-50 p-4">
                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    Abre
                  </span>
                  <input
                    type="time"
                    value={formatTime(hour.opensAt)}
                    disabled={hour.isClosed}
                    onChange={(event) => updateHourField(hour.id, { opensAt: event.target.value })}
                    className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400 disabled:cursor-not-allowed disabled:bg-ink-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    Fecha
                  </span>
                  <input
                    type="time"
                    value={formatTime(hour.closesAt)}
                    disabled={hour.isClosed}
                    onChange={(event) => updateHourField(hour.id, { closesAt: event.target.value })}
                    className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400 disabled:cursor-not-allowed disabled:bg-ink-100"
                  />
                </label>

                <label className="flex items-end">
                  <span className="flex h-12 w-full items-center gap-3 rounded-2xl border border-ink-100 bg-white px-4">
                    <input
                      type="checkbox"
                      checked={hour.isClosed}
                      onChange={(event) => updateHourField(hour.id, { isClosed: event.target.checked })}
                      className="h-4 w-4 rounded border-ink-300 text-coral-500 focus:ring-coral-400"
                    />
                    <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      Fechada
                    </span>
                  </span>
                </label>
              </div>
            </article>
          ))}
        </div>
      </div>
    </SectionFrame>
  )
}
