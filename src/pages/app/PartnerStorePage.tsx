import type { ChangeEvent } from 'react'
import { Camera, Clock3, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import type { PartnerStore } from '@/types'
import { formatCurrency, formatTime } from '@/lib/utils'
import { MiniInfoCard, SectionFrame } from '@/components/partner/PartnerUi'

type StoreTabId = 'loja' | 'endereco' | 'acesso'

const storeTabs: Array<{ id: StoreTabId; label: string }> = [
  { id: 'loja', label: 'Loja' },
  { id: 'endereco', label: 'Endereco' },
  { id: 'acesso', label: 'Gestao de acesso' },
]

function parseCurrencyNumber(value: string) {
  const normalized = value.replace(',', '.')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function parseInteger(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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

function StoreEditorTab() {
  const { data } = usePartnerPageData()
  const { updateStore } = usePartnerDraftStore()
  const coverInputRef = useRef<HTMLInputElement | null>(null)
  const logoInputRef = useRef<HTMLInputElement | null>(null)
  const [draftStore, setDraftStore] = useState<PartnerStore>(data.store)

  useEffect(() => {
    setDraftStore(data.store)
  }, [data.store])

  function handleStorePatch(patch: Partial<PartnerStore>) {
    setDraftStore((current) => ({
      ...current,
      ...patch,
    }))
  }

  function handleSaveStore() {
    updateStore(data.store.id, draftStore)
    toast.success('Dados da loja salvos com sucesso.')
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    field: 'coverImageUrl' | 'logoImageUrl'
  ) {
    const file = event.target.files?.[0]
    if (!file) return

    const dataUrl = await readFileAsDataUrl(file)
    handleStorePatch({ [field]: dataUrl })
    event.target.value = ''
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <article className="panel-card overflow-hidden">
        <div className="space-y-5">
          <div className="relative overflow-hidden">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={(event) => void handleImageUpload(event, 'coverImageUrl')}
              className="hidden"
            />
            <div
              className="h-[260px] w-full bg-cover bg-center"
              style={{
                backgroundColor: data.store.accentColor,
                backgroundImage: draftStore.coverImageUrl ? `url('${draftStore.coverImageUrl}')` : undefined,
                filter: draftStore.isOpen ? undefined : 'grayscale(1)',
              }}
            />

            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-700 shadow-soft transition hover:bg-coral-500 hover:text-white"
            >
              <Camera className="h-4 w-4" />
              Trocar capa
            </button>

            <div className="absolute inset-x-0 bottom-0 flex justify-end p-4">
              <span
                className={[
                  'inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold',
                  draftStore.isOpen ? 'bg-[#20a35b] text-white' : 'bg-white text-[#5f5f5f]',
                ].join(' ')}
              >
                <Clock3 className="h-3.5 w-3.5" />
                {draftStore.isOpen ? `Aberto ate ${formatTime(data.hours[0]?.closesAt)}` : 'Fechado agora'}
              </span>
            </div>
          </div>

          <div className="px-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-coral-600">
              {draftStore.categoryName || 'Loja'}
            </p>
            <div className="mt-3 flex items-start gap-4">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => void handleImageUpload(event, 'logoImageUrl')}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft transition hover:scale-[1.02]"
                title="Trocar logo"
              >
                {draftStore.logoImageUrl ? (
                  <img src={draftStore.logoImageUrl} alt={draftStore.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-ink-700">{draftStore.name.slice(0, 1)}</span>
                )}
                <span className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-700 shadow-soft transition group-hover:bg-coral-500 group-hover:text-white">
                  <Camera className="h-3.5 w-3.5" />
                </span>
              </button>
              <div className="min-w-0">
                <h3 className="text-[28px] font-bold tracking-[-0.04em] text-ink-900">{draftStore.name}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">{draftStore.tagline}</p>
              </div>
            </div>
          </div>

          <div className="px-6">
            <div className="w-full rounded-xl border border-ink-100 bg-ink-50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-coral-600">Detalhes da loja</span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Frete</p>
                  <p className="mt-1 text-sm font-bold text-ink-900">
                    {draftStore.deliveryFee === 0 ? 'Gratis' : formatCurrency(draftStore.deliveryFee)}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Avaliacao</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-bold text-ink-900">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {draftStore.rating.toFixed(1)}
                  </p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Tempo</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-bold text-ink-900">
                    <Clock3 className="h-3.5 w-3.5" />
                    {draftStore.etaMin}-{draftStore.etaMax} min
                  </p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Retirada</p>
                  <p className="mt-1 flex items-center gap-1 text-sm font-bold text-ink-900">
                    <Clock3 className="h-3.5 w-3.5" />
                    {draftStore.pickupEta} min
                  </p>
                </div>
                <div className="rounded-xl border border-ink-100 bg-white px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-400">Pedido minimo</p>
                  <p className="mt-1 text-sm font-bold text-ink-900">{formatCurrency(draftStore.minOrderAmount)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pb-6" />
        </div>
      </article>

      <article className="panel-card p-6 xl:order-first">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-ink-900">Informacoes da loja</p>
            <p className="mt-1 text-sm text-ink-500">Atualize os dados principais exibidos no painel.</p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Nome da loja</span>
            <input
              type="text"
              value={draftStore.name}
              onChange={(event) => handleStorePatch({ name: event.target.value })}
              placeholder="Digite o nome exibido para os clientes"
              className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Categoria
            </span>
            <input
              type="text"
              value={draftStore.categoryName}
              onChange={(event) => handleStorePatch({ categoryName: event.target.value })}
              placeholder="Ex.: Hamburgueria, Pizza, Mercado"
              className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Chamada da loja</span>
            <input
              type="text"
              value={draftStore.tagline}
              onChange={(event) => handleStorePatch({ tagline: event.target.value })}
              placeholder="Frase curta para apresentar a loja"
              className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm text-ink-900 outline-none transition focus:border-coral-400"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Descricao
            </span>
            <textarea
              value={draftStore.description}
              onChange={(event) => handleStorePatch({ description: event.target.value })}
              rows={4}
              placeholder="Conte um pouco mais sobre a operacao, cardapio ou proposta da loja"
              className="w-full rounded-2xl border border-ink-100 bg-white px-4 py-3 text-sm text-ink-900 outline-none transition focus:border-coral-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Taxa de entrega
            </span>
            <div className="flex h-12 items-center rounded-2xl border border-ink-100 bg-white pl-4 focus-within:border-coral-400">
              <span className="shrink-0 text-sm font-semibold text-ink-500">R$</span>
              <input
                type="number"
                step="0.01"
                value={draftStore.deliveryFee}
                onChange={(event) => handleStorePatch({ deliveryFee: parseCurrencyNumber(event.target.value) })}
                placeholder="0,00"
                className="h-full w-full rounded-r-2xl bg-transparent px-3 text-sm font-semibold text-ink-900 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
              Pedido minimo
            </span>
            <div className="flex h-12 items-center rounded-2xl border border-ink-100 bg-white pl-4 focus-within:border-coral-400">
              <span className="shrink-0 text-sm font-semibold text-ink-500">R$</span>
              <input
                type="number"
                step="0.01"
                value={draftStore.minOrderAmount}
                onChange={(event) => handleStorePatch({ minOrderAmount: parseCurrencyNumber(event.target.value) })}
                placeholder="0,00"
                className="h-full w-full rounded-r-2xl bg-transparent px-3 text-sm font-semibold text-ink-900 outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tempo minimo</span>
            <input
              type="number"
              value={draftStore.etaMin}
              onChange={(event) => handleStorePatch({ etaMin: parseInteger(event.target.value) })}
              placeholder="20"
              className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tempo maximo</span>
            <input
              type="number"
              value={draftStore.etaMax}
              onChange={(event) => handleStorePatch({ etaMax: parseInteger(event.target.value) })}
              placeholder="35"
              className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Tempo retirada</span>
            <input
              type="number"
              value={draftStore.pickupEta}
              onChange={(event) => handleStorePatch({ pickupEta: parseInteger(event.target.value) })}
              placeholder="15"
              className="h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:col-span-2">
            <div>
              <p className="text-sm font-semibold text-ink-900">Loja ativa</p>
              <p className="mt-1 text-sm text-ink-500">Controla se a operacao aparece como ativa no painel.</p>
            </div>
            <ThemeSwitch
              checked={draftStore.active}
              onChange={(nextValue) => handleStorePatch({ active: nextValue })}
              ariaLabel="Alternar loja ativa"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveStore}
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-coral-500 px-8 text-sm font-semibold text-white transition hover:bg-coral-600"
          >
            Salvar
          </button>
        </div>
      </article>
    </div>
  )
}

function StoreAddressTab() {
  const { data } = usePartnerPageData()

  return (
    <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
      <article className="panel-card p-6">
        <p className="text-sm font-semibold text-ink-900">Endereco operacional</p>
        <p className="mt-2 text-sm leading-7 text-ink-600">
          Simulacao visual da configuracao de atendimento da loja com base nas areas de entrega ativas do painel.
        </p>

        <div className="mt-6 space-y-3">
          <MiniInfoCard label="Base" value="Centro" />
          <MiniInfoCard label="Categoria" value={data.store.categoryName || 'Loja'} />
          <MiniInfoCard label="Pedido minimo" value={formatCurrency(data.store.minOrderAmount)} />
          <MiniInfoCard label="Taxa padrao" value={formatCurrency(data.store.deliveryFee)} />
        </div>
      </article>

      <article className="panel-card p-6">
        <p className="text-sm font-semibold text-ink-900">Areas cobertas</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.deliveryAreas.map((area) => (
            <div key={area.id} className="rounded-3xl border border-ink-100 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-ink-900">{area.name}</p>
                <span
                  className={[
                    'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]',
                    area.active ? 'bg-mint-100 text-mint-700' : 'bg-ink-100 text-ink-500',
                  ].join(' ')}
                >
                  {area.active ? 'Ativa' : 'Pausada'}
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-500">Prazo estimado: {area.etaLabel}</p>
              <p className="mt-1 text-sm font-semibold text-ink-800">Taxa: {formatCurrency(area.fee)}</p>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}

function StoreAccessTab() {
  const { data } = usePartnerPageData()

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="panel-card p-6">
        <p className="text-sm font-semibold text-ink-900">Responsavel principal</p>
        <div className="mt-5 rounded-3xl border border-ink-100 bg-ink-50 p-5">
          <p className="text-lg font-bold text-ink-900">{data.profile.name}</p>
          <p className="mt-1 text-sm text-ink-500">{data.profile.email}</p>
          <p className="mt-3 inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">
            {data.profile.role}
          </p>
        </div>
      </article>

      <article className="panel-card p-6">
        <p className="text-sm font-semibold text-ink-900">Gestao de acesso</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MiniInfoCard label="Perfil" value={data.profile.role} />
          <MiniInfoCard label="Loja vinculada" value={data.store.name} />
          <MiniInfoCard label="Slug" value={data.store.slug} />
        </div>

        <div className="mt-5 rounded-3xl border border-ink-100 bg-white p-5">
          <p className="text-sm leading-7 text-ink-600">
            Esta secao simula governanca de acesso no tema do painel. O cadastro principal e o vinculo operacional da
            loja aparecem aqui enquanto o restante do app continua refletindo os dados do perfil atual.
          </p>
        </div>
      </article>
    </div>
  )
}

export function PartnerStorePage() {
  const [activeTab, setActiveTab] = useState<StoreTabId>('loja')

  return (
    <SectionFrame eyebrow="Loja" title="Edicao simulada do estabelecimento">
      <div className="space-y-6">
        <div className="panel-card px-4 py-3 sm:px-5">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto">
            {storeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                  activeTab === tab.id
                    ? 'border-coral-200 bg-coral-50 text-coral-700 shadow-soft'
                    : 'border-transparent bg-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'loja' ? <StoreEditorTab /> : null}
        {activeTab === 'endereco' ? <StoreAddressTab /> : null}
        {activeTab === 'acesso' ? <StoreAccessTab /> : null}
      </div>
    </SectionFrame>
  )
}
