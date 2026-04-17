import { useEffect, useRef, useState } from 'react'
import { Copy, ImagePlus, Printer, RefreshCw, Trash2 } from 'lucide-react'
import { PartnerOrderSettingsPanel } from '@/components/partner/PartnerOrderSettingsPanel'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { isElectron, getPrinters, getSavedPrinter, savePrinter, getAutoPrint, saveAutoPrint } from '@/hooks/usePrint'
import { listStoreImages, uploadStoreImage } from '@/services/partner'
import type { StoreImageItem } from '@/services/partner'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'

type ConfigTab = 'operacional' | 'imagens' | 'impressao'

const MAX_FILE_SIZE = 5 * 1_048_576 // 5 MB

function ImageLibrary({ storeId }: { storeId: string }) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const [images, setImages] = useState<StoreImageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deletingPath, setDeletingPath] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    listStoreImages(storeId)
      .then(setImages)
      .catch(() => toast.error('Nao foi possivel carregar as imagens.'))
      .finally(() => setLoading(false))
  }, [storeId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Imagem muito grande. Maximo 5 MB.`)
      return
    }

    setUploading(true)
    try {
      const publicUrl = await uploadStoreImage(storeId, file)
      const newItem: StoreImageItem = {
        name: file.name,
        path: `${storeId}/${file.name}`,
        publicUrl,
        updatedAt: new Date().toISOString(),
      }
      setImages((prev) => [newItem, ...prev])
      toast.success('Imagem enviada com sucesso.')
    } catch {
      toast.error('Falha ao enviar imagem.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(img: StoreImageItem) {
    if (!supabase) return
    setDeletingPath(img.path)
    try {
      const { error } = await supabase.storage.from('store-images').remove([img.path])
      if (error) throw error
      setImages((prev) => prev.filter((i) => i.path !== img.path))
      toast.success('Imagem removida.')
    } catch {
      toast.error('Nao foi possivel remover a imagem.')
    } finally {
      setDeletingPath(null)
    }
  }

  function handleCopy(img: StoreImageItem) {
    navigator.clipboard.writeText(img.publicUrl).then(() => {
      setCopiedPath(img.path)
      toast.success('URL copiada!')
      setTimeout(() => setCopiedPath(null), 2000)
    })
  }

  return (
    <div className="space-y-4">
      {/* Header com upload */}
      <div className="panel-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Biblioteca de Imagens</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {images.length} imagem{images.length !== 1 ? 's' : ''} · Maximo 5 MB por arquivo · JPG, PNG, WebP
            </p>
          </div>
          <input
            ref={uploadInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => void handleUpload(e)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => !uploading && uploadInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-10 items-center gap-2 rounded-2xl bg-coral-500 px-4 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-50"
          >
            {uploading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading ? 'Enviando...' : 'Enviar imagem'}
          </button>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="panel-card p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {[1,2,3,4,5].map((i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-ink-100" />
          ))}
        </div>
      </div>
      ) : images.length === 0 ? (
        <div className="panel-card flex flex-col items-center gap-3 py-16 text-center">
          <ImagePlus className="h-10 w-10 text-ink-200" />
          <p className="text-sm text-ink-400">Nenhuma imagem ainda.</p>
          <p className="text-xs text-ink-300">Clique em "Enviar imagem" para adicionar fotos de produtos e da loja.</p>
        </div>
      ) : (
        <div className="panel-card p-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {images.map((img) => (
            <div key={img.path} className="group relative aspect-square overflow-hidden rounded-2xl border border-ink-100 bg-ink-50">
              <img
                src={img.publicUrl}
                alt={img.name}
                className="h-full w-full object-cover transition group-hover:scale-105"
              />
              {/* Overlay com ações */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleCopy(img)}
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-white transition',
                    copiedPath === img.path ? 'bg-green-500' : 'bg-white/20 hover:bg-white/30'
                  )}
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedPath === img.path ? 'Copiado!' : 'Copiar URL'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(img)}
                  disabled={deletingPath === img.path}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-coral-500/80 px-3 text-xs font-semibold text-white transition hover:bg-coral-500 disabled:opacity-50"
                >
                  {deletingPath === img.path ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Remover
                </button>
              </div>
              {/* Nome */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 opacity-0 transition group-hover:opacity-100">
                <p className="truncate text-[10px] text-white/90">{img.name}</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}

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
  const { data } = usePartnerPageData()
  const [activeTab, setActiveTab] = useState<ConfigTab>('operacional')

  const tabs: Array<{ id: ConfigTab; label: string }> = [
    { id: 'operacional', label: 'Operacional' },
    { id: 'imagens', label: 'Biblioteca de Imagens' },
    ...(isElectron ? [{ id: 'impressao' as ConfigTab, label: 'Impressao' }] : []),
  ]

  return (
    <SectionFrame eyebrow="Configuracoes" title="Ajustes operacionais">
      {/* Tabs */}
      <div className="panel-card px-4 py-3 sm:px-5">
        <div className="hide-scrollbar flex gap-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                activeTab === tab.id
                  ? 'border-coral-200 bg-coral-50 text-coral-700 shadow-soft'
                  : 'border-transparent bg-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'operacional' && <PartnerOrderSettingsPanel />}
      {activeTab === 'imagens' && <ImageLibrary storeId={data.store.id} />}
      {activeTab === 'impressao' && isElectron && <PrinterSettings />}
    </SectionFrame>
  )
}
