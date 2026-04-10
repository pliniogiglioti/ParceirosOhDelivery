import { Info, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerSimulationStore } from '@/hooks/usePartnerSimulationStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { playOrderSound, SOUND_MODELS } from '@/lib/orderSound'
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
        'inline-flex h-5 w-9 items-center rounded-full px-0.5 transition',
        checked ? 'bg-coral-500' : 'bg-ink-200',
      ].join(' ')}
    >
      <span
        className={[
          'h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}

export function PartnerOrderSettingsPanel() {
  const { data } = usePartnerPageData()
  const { orderSettingsByStoreId, hydrateOrderSettings, updateOrderSettings, updateStore } = usePartnerSimulationStore()
  const persistedSettings = orderSettingsByStoreId[data.store.id]

  function createDefaultSettings(): PartnerOrderSettings {
    return {
      acceptTime: 10,
      playSound: true,
      soundModel: 'balcao' as const,
      showNotification: false,
      printAutomatically: false,
      acceptAutomatically: false,
    }
  }

  const [draftSettings, setDraftSettings] = useState<PartnerOrderSettings>(createDefaultSettings)
  const [draftStoreTimes, setDraftStoreTimes] = useState({
    etaMin: data.store.etaMin,
    etaMax: data.store.etaMax,
    pickupEta: data.store.pickupEta,
  })

  useEffect(() => {
    hydrateOrderSettings(data.store.id, createDefaultSettings())
  }, [data.store.etaMax, data.store.etaMin, data.store.id, hydrateOrderSettings])

  useEffect(() => {
    setDraftSettings({
      ...createDefaultSettings(),
      ...(persistedSettings ?? {}),
    })
  }, [persistedSettings, data.store.etaMax, data.store.etaMin, data.store.id])

  useEffect(() => {
    setDraftStoreTimes({
      etaMin: data.store.etaMin,
      etaMax: data.store.etaMax,
      pickupEta: data.store.pickupEta,
    })
  }, [data.store.etaMax, data.store.etaMin, data.store.id, data.store.pickupEta])

  function handleOrderSettingsPatch(patch: Partial<PartnerOrderSettings>) {
    setDraftSettings((current) => ({
      ...current,
      ...patch,
    }))
  }

  function handleStoreTimesPatch(patch: Partial<typeof draftStoreTimes>) {
    setDraftStoreTimes((current) => ({
      ...current,
      ...patch,
    }))
  }

  function handleSaveOrderSettings() {
    updateStore(data.store.id, draftStoreTimes)
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
          <p className="text-sm font-semibold text-ink-900">Prazos da loja</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tempo minimo</span>
              <input
                type="number"
                min="0"
                max="99"
                value={draftStoreTimes.etaMin}
                onChange={(event) => handleStoreTimesPatch({ etaMin: parseInteger(event.target.value) })}
                className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tempo maximo</span>
              <input
                type="number"
                min="0"
                max="99"
                value={draftStoreTimes.etaMax}
                onChange={(event) => handleStoreTimesPatch({ etaMax: parseInteger(event.target.value) })}
                className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tempo retirada</span>
              <input
                type="number"
                min="0"
                max="99"
                value={draftStoreTimes.pickupEta}
                onChange={(event) => handleStoreTimesPatch({ pickupEta: parseInteger(event.target.value) })}
                className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
              />
            </label>
          </div>
        </div>

        <div className="rounded-3xl border border-ink-100 bg-white p-4 sm:p-5">
          <p className="text-sm font-semibold text-ink-900">Automacoes do fluxo</p>
          <div className="mt-5 space-y-4">
            <label className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-ink-900">Imprimir automaticamente</p>
                <p className="mt-1 text-sm text-ink-500">Envia o pedido direto para impressao ao chegar na loja.</p>
              </div>
              <ThemeSwitch
                checked={draftSettings.printAutomatically}
                onChange={(nextValue) => handleOrderSettingsPatch({ printAutomatically: nextValue })}
                ariaLabel="Alternar impressao automatica"
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-ink-50 px-4 py-4">
              <div>
                <p className="text-sm font-semibold text-ink-900">Aceitar pedido automaticamente</p>
                <p className="mt-1 text-sm text-ink-500">Confirma novos pedidos sem depender de aprovacao manual.</p>
              </div>
              <ThemeSwitch
                checked={draftSettings.acceptAutomatically}
                onChange={(nextValue) => handleOrderSettingsPatch({ acceptAutomatically: nextValue })}
                ariaLabel="Alternar aceite automatico de pedidos"
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-ink-100 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-ink-900">Alertas da operacao</p>
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-ink-100 bg-ink-50 px-4 py-4 space-y-4">
            {/* Switch row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink-900">Emitir som ao receber pedidos</p>
                <p className="mt-1 text-sm text-ink-500">Sinal sonoro para novos pedidos em espera.</p>
              </div>
              <ThemeSwitch
                checked={draftSettings.playSound}
                onChange={(nextValue) => handleOrderSettingsPatch({ playSound: nextValue })}
                ariaLabel="Alternar som ao receber pedidos"
              />
            </div>

            {/* Sound model selector */}
            {draftSettings.playSound && (
              <div>
                <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">Modelo de som</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {SOUND_MODELS.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleOrderSettingsPatch({ soundModel: s.id })}
                      className={[
                        'flex items-start gap-3 rounded-2xl border px-3 py-2.5 text-left transition',
                        draftSettings.soundModel === s.id
                          ? 'border-coral-300 bg-coral-50'
                          : 'border-ink-100 bg-white hover:bg-ink-50',
                      ].join(' ')}
                    >
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); playOrderSound(s.id) }}
                        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600 transition hover:bg-coral-100 hover:text-coral-600"
                        title={`Ouvir ${s.label}`}
                      >
                        <Play className="h-2.5 w-2.5" />
                      </button>
                      <div className="min-w-0">
                        <p className={['text-xs font-semibold', draftSettings.soundModel === s.id ? 'text-coral-700' : 'text-ink-900'].join(' ')}>
                          {s.label}
                        </p>
                        <p className="mt-0.5 text-[10px] leading-relaxed text-ink-400">{s.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

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
