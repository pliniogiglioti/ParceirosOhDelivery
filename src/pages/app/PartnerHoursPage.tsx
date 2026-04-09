import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { formatTime } from '@/lib/utils'
import { SectionFrame, weekDays } from '@/components/partner/PartnerUi'

function normalizeTimeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value.slice(0, 8)
}

export function PartnerHoursPage() {
  const { data, source } = usePartnerPageData()
  const { updateStoreHour } = usePartnerSimulationStore()

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

    updateStoreHour(data.store.id, hourId, normalizedPatch)
  }

  return (
    <SectionFrame eyebrow="Horarios" title="Agenda semanal da loja">
      <div className="panel-card space-y-6 p-6">
        <div className="flex flex-col gap-3 rounded-3xl bg-ink-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">Edicao simulada da tabela `store_hours`</p>
            <p className="mt-1 text-sm text-ink-500">
              Campos refletidos: `week_day`, `opens_at`, `closes_at` e `is_closed`.
            </p>
          </div>
          <span className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-ink-500">
            Fonte: {source}
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.hours.map((hour) => (
            <article
              key={hour.id}
              className="flex h-full flex-col rounded-3xl border border-coral-100 bg-white p-4 shadow-soft"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink-900">{weekDays[hour.weekDay] ?? `Dia ${hour.weekDay}`}</p>
                    <span className="rounded-full bg-ink-50 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      week_day {hour.weekDay}
                    </span>
                    <span
                      className={[
                        'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
                        hour.isClosed ? 'bg-coral-100 text-coral-700' : 'bg-mint-100 text-mint-700',
                      ].join(' ')}
                    >
                      {hour.isClosed ? 'Fechado' : 'Aberto'}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-ink-600">
                    {hour.isClosed ? 'Loja fechada neste dia.' : `${formatTime(hour.opensAt)} - ${formatTime(hour.closesAt)}`}
                  </p>
                </div>
              </div>

              <div className="hours-editor-panel mt-4 grid gap-3 rounded-3xl bg-ink-50 p-4">
                <label className="block">
                  <span className="mb-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    opens_at
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
                  <span className="mb-2 block font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                    closes_at
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
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      is_closed
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
