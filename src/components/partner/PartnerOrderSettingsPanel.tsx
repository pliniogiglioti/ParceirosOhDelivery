import { Info } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import type { PartnerOrderSettings } from '@/types'

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function ThemeSwitch({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (nextValue: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={[
        'inline-flex h-8 w-14 items-center rounded-full px-1 transition',
        checked ? 'bg-coral-500' : 'bg-ink-200',
      ].join(' ')}
    >
      <span
        className={[
          'h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-6' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export function PartnerOrderSettingsPanel() {
  const { data } = usePartnerPageData()
  const { orderSettingsByStoreId, hydrateOrderSettings, updateOrderSettings } = usePartnerSimulationStore()
  const persistedSettings = orderSettingsByStoreId[data.store.id]
  const [draftSettings, setDraftSettings] = useState<PartnerOrderSettings>({
    acceptTime: 10,
    deliveryForecast: data.store.etaMax,
    pickupForecast: data.store.etaMin,
    playSound: true,
    showNotification: false,
  })

  useEffect(() => {
    hydrateOrderSettings(data.store.id, {
      acceptTime: 10,
      deliveryForecast: data.store.etaMax,
      pickupForecast: data.store.etaMin,
      playSound: true,
      showNotification: false,
    })
  }, [data.store.etaMax, data.store.etaMin, data.store.id, hydrateOrderSettings])

  const settings = persistedSettings ?? {
    acceptTime: 10,
    deliveryForecast: data.store.etaMax,
    pickupForecast: data.store.etaMin,
    playSound: true,
    showNotification: false,
  }

  useEffect(() => {
    setDraftSettings(settings)
  }, [persistedSettings, data.store.id, data.store.etaMax, data.store.etaMin])

  function handleOrderSettingsPatch(patch: Partial<PartnerOrderSettings>) {
    setDraftSettings((current) => ({
      ...current,
      ...patch,
    }))
  }

  function handleSaveOrderSettings() {
    updateOrderSettings(data.store.id, draftSettings)
    toast.success('Configuracoes de pedidos salvas com sucesso.')
  }

  return (
    <article className="panel-card p-6 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-base font-semibold text-ink-900">Fluxo de pedidos</p>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Configure tempos operacionais e alertas de atendimento no tema do painel.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div className="rounded-3xl border border-ink-100 bg-ink-50 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <span>Tempo para aceitar pedido</span>
                <Info className="h-4 w-4 text-coral-500" />
              </div>
              <p className="mt-1 text-sm text-ink-500">Define o limite para confirmar novos pedidos.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="10"
                max="99"
                value={draftSettings.acceptTime}
                onChange={(event) => handleOrderSettingsPatch({ acceptTime: parseInteger(event.target.value) })}
                className="h-12 w-24 rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
              <span className="text-sm font-medium text-ink-500">min</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-ink-100 bg-ink-50 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <div>
              <div className="text-sm font-semibold text-ink-900">Previsao para entrega</div>
              <p className="mt-1 text-sm text-ink-500">Prazo exibido para pedidos com entrega.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="99"
                value={draftSettings.deliveryForecast}
                onChange={(event) =>
                  handleOrderSettingsPatch({ deliveryForecast: parseInteger(event.target.value) })
                }
                className="h-12 w-24 rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
              <span className="text-sm font-medium text-ink-500">min</span>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-ink-100 bg-ink-50 p-4 sm:p-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center">
            <div>
              <div className="text-sm font-semibold text-ink-900">Previsao para retirada</div>
              <p className="mt-1 text-sm text-ink-500">Prazo informado para pedidos retirados na loja.</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                max="99"
                value={draftSettings.pickupForecast}
                onChange={(event) => handleOrderSettingsPatch({ pickupForecast: parseInteger(event.target.value) })}
                className="h-12 w-24 rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
              <span className="text-sm font-medium text-ink-500">min</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-ink-100 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink-900">Alertas da operacao</p>
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink-900">Emitir som ao receber pedidos</p>
              <p className="mt-1 text-sm text-ink-500">Sinal sonoro para novos pedidos em espera.</p>
            </div>
            <ThemeSwitch
              checked={draftSettings.playSound}
              onChange={(nextValue) => handleOrderSettingsPatch({ playSound: nextValue })}
              ariaLabel="Alternar som ao receber pedidos"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink-900">Exibir notificacao de novos pedidos</p>
              <p className="mt-1 text-sm text-ink-500">Mantem o alerta visual ativo durante o atendimento.</p>
            </div>
            <ThemeSwitch
              checked={draftSettings.showNotification}
              onChange={(nextValue) => handleOrderSettingsPatch({ showNotification: nextValue })}
              ariaLabel="Alternar notificacao de novos pedidos"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveOrderSettings}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-8 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Salvar
          </button>
        </div>
      </div>
    </article>
  )
}
