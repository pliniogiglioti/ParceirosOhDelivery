import { useEffect, useState } from 'react'
import { Printer, RefreshCw } from 'lucide-react'
import { PartnerOrderSettingsPanel } from '@/components/partner/PartnerOrderSettingsPanel'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { isElectron, getPrinters, getSavedPrinter, savePrinter, getAutoPrint, saveAutoPrint } from '@/hooks/usePrint'
import toast from 'react-hot-toast'

function PrinterSettings() {
  const [printers, setPrinters] = useState<Array<{ name: string; displayName: string; isDefault: boolean }>>([])
  const [selectedPrinter, setSelectedPrinter] = useState('')
  const [autoPrint, setAutoPrint] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [list, saved, auto] = await Promise.all([
        getPrinters(),
        getSavedPrinter(),
        getAutoPrint(),
      ])
      setPrinters(list)
      setSelectedPrinter(saved || list.find((p) => p.isDefault)?.name || list[0]?.name || '')
      setAutoPrint(auto)
      setLoading(false)
    }
    void load()
  }, [])

  async function handleSavePrinter(name: string) {
    setSelectedPrinter(name)
    await savePrinter(name)
    toast.success('Impressora salva.')
  }

  async function handleToggleAutoPrint(enabled: boolean) {
    setAutoPrint(enabled)
    await saveAutoPrint(enabled)
    toast.success(enabled ? 'Impressao automatica ativada.' : 'Impressao automatica desativada.')
  }

  async function handleRefreshPrinters() {
    setLoading(true)
    const list = await getPrinters()
    setPrinters(list)
    setLoading(false)
    toast.success('Lista de impressoras atualizada.')
  }

  return (
    <div className="panel-card p-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-ink-100">
          <Printer className="h-4 w-4 text-ink-600" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">Impressao de pedidos</p>
          <p className="text-xs text-ink-500">Configure a impressora termica para cupons de 80mm</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Seleção de impressora */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Impressora</span>
            <button
              type="button"
              onClick={handleRefreshPrinters}
              disabled={loading}
              className="flex items-center gap-1 text-xs font-semibold text-coral-500 hover:text-coral-600 transition disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          </div>
          {loading ? (
            <div className="h-12 animate-pulse rounded-2xl bg-ink-100" />
          ) : printers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-200 bg-ink-50 px-4 py-3 text-sm text-ink-400">
              Nenhuma impressora encontrada. Verifique se a impressora esta conectada.
            </div>
          ) : (
            <select
              value={selectedPrinter}
              onChange={(e) => void handleSavePrinter(e.target.value)}
              className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-medium text-ink-900 outline-none transition focus:border-coral-400"
            >
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.displayName || p.name}{p.isDefault ? ' (padrão)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Impressão automática */}
        <div className="flex items-center justify-between rounded-2xl border border-ink-100 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-ink-900">Impressao automatica</p>
            <p className="mt-0.5 text-xs text-ink-500">Imprime automaticamente ao receber um novo pedido</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoPrint}
            onClick={() => void handleToggleAutoPrint(!autoPrint)}
            className={`inline-flex h-5 w-9 items-center rounded-full px-0.5 transition ${autoPrint ? 'bg-coral-500' : 'bg-ink-200'}`}
          >
            <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${autoPrint ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function PartnerConfiguracoesPage() {
  return (
    <SectionFrame eyebrow="Configuracoes" title="Ajustes operacionais">
      <PartnerOrderSettingsPanel />
      {isElectron && <PrinterSettings />}
    </SectionFrame>
  )
}
