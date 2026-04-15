import { Camera, ChevronDown, Clock3, Mail, MoreVertical, Plus, Shield, Star, Trash2, UserCheck, UserX } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { getStoreCategories } from '@/services/profile'
import { saveStore } from '@/services/partner'
import {
  fetchStoreMembers,
  inviteStoreMember,
  updateStoreMember,
  removeStoreMember,
} from '@/services/members'
import type { StoreMember, MemberRole } from '@/services/members'
import { MapPicker } from '@/components/MapPicker'
import type { PartnerStore, StoreCategory } from '@/types'
import { formatCurrency, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { MiniInfoCard, SectionFrame } from '@/components/partner/PartnerUi'
import { StoreImagePickerModal } from '@/components/partner/StoreImagePickerModal'

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

function ThemeSwitch({
  checked,
  onChange,
  ariaLabel,
  disabled = false,
}: {
  checked: boolean
  onChange: (nextValue: boolean) => void
  ariaLabel: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={[
        'inline-flex h-5 w-9 items-center rounded-full px-0.5 transition',
        checked ? 'bg-coral-500' : 'bg-ink-200',
        disabled ? 'cursor-not-allowed opacity-40' : '',
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

function storeActivationBlockers(store: PartnerStore, hasActiveProduct: boolean): string[] {
  const missing: string[] = []
  if (!store.name.trim()) missing.push('Nome da loja')
  if (!store.categoryId) missing.push('Categoria')
  if (!store.addressStreet?.trim()) missing.push('Rua (endereço)')
  if (!store.addressNeighborhood?.trim()) missing.push('Bairro')
  if (!store.addressCity?.trim()) missing.push('Cidade')
  if (!store.addressState?.trim()) missing.push('Estado')
  if (!store.addressZip?.trim()) missing.push('CEP')
  if (!hasActiveProduct) missing.push('Pelo menos 1 produto ativo')
  return missing
}

function hasStoreEditorChanges(current: PartnerStore, initial: PartnerStore) {
  return (
    current.name !== initial.name ||
    current.categoryId !== initial.categoryId ||
    current.categoryName !== initial.categoryName ||
    current.description !== initial.description ||
    current.deliveryFee !== initial.deliveryFee ||
    current.minOrderAmount !== initial.minOrderAmount ||
    current.etaMin !== initial.etaMin ||
    current.etaMax !== initial.etaMax ||
    current.pickupEta !== initial.pickupEta ||
    current.active !== initial.active ||
    current.coverImageUrl !== initial.coverImageUrl ||
    current.logoImageUrl !== initial.logoImageUrl
  )
}

function hasStoreAddressChanges(current: PartnerStore, initial: PartnerStore) {
  return (
    current.addressStreet !== initial.addressStreet ||
    current.addressNumber !== initial.addressNumber ||
    current.addressComplement !== initial.addressComplement ||
    current.addressNeighborhood !== initial.addressNeighborhood ||
    current.addressCity !== initial.addressCity ||
    current.addressState !== initial.addressState ||
    current.addressZip !== initial.addressZip ||
    current.lat !== initial.lat ||
    current.lng !== initial.lng
  )
}

function StoreEditorTab() {
  const { data } = usePartnerPageData()
  const { updateStore } = usePartnerDraftStore()
  const [draftStore, setDraftStore] = useState<PartnerStore>(data.store)
  const [categories, setCategories] = useState<StoreCategory[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [imagePickerSlot, setImagePickerSlot] = useState<'logo' | 'cover' | null>(null)

  useEffect(() => {
    setDraftStore(data.store)
  }, [data.store])

  useEffect(() => { void getStoreCategories().then(setCategories) }, [])

  function handleStorePatch(patch: Partial<PartnerStore>) {
    setDraftStore((current) => ({
      ...current,
      ...patch,
    }))
  }

  const [savingImageSlot, setSavingImageSlot] = useState<'cover' | 'logo' | null>(null)

  const hasActiveProduct = data.products.some((p) => p.active)
  const blockers = storeActivationBlockers(draftStore, hasActiveProduct)
  const canActivate = blockers.length === 0
  const hasChanges = hasStoreEditorChanges(draftStore, data.store)

  async function handleSaveStore() {
    if (!hasChanges || isSaving) return

    setIsSaving(true)
    try {
      await saveStore(data.store.id, draftStore)
      updateStore(data.store.id, draftStore)
      toast.success('Dados da loja salvos com sucesso.')
    } catch {
      toast.error('Nao foi possivel salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  // Chamado quando o usuario seleciona uma imagem do modal da galeria
  async function handleImageSelected(publicUrl: string, slot: 'cover' | 'logo') {
    const field = slot === 'cover' ? 'coverImageUrl' : 'logoImageUrl'
    handleStorePatch({ [field]: publicUrl })

    setSavingImageSlot(slot)
    try {
      await saveStore(data.store.id, { [field]: publicUrl })
      updateStore(data.store.id, { ...draftStore, [field]: publicUrl })
      toast.success('Imagem atualizada com sucesso.')
    } catch {
      toast.error('Nao foi possivel salvar a imagem. Tente novamente.')
    } finally {
      setSavingImageSlot(null)
    }
  }


  return (
    <>
    <StoreImagePickerModal
      open={imagePickerSlot !== null}
      storeId={data.store.id}
      slot={imagePickerSlot ?? 'logo'}
      onSelect={(url) => imagePickerSlot && void handleImageSelected(url, imagePickerSlot)}
      onClose={() => setImagePickerSlot(null)}
    />
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <article className="panel-card overflow-hidden">
        <div className="space-y-5">
          <div className="relative overflow-hidden">
            <div
              className="h-[260px] w-full bg-cover bg-center"
              style={{
                backgroundColor: '#f4f4f5',
                backgroundImage: draftStore.coverImageUrl ? `url('${draftStore.coverImageUrl}')` : undefined,
                filter: draftStore.isOpen ? undefined : 'grayscale(1)',
              }}
            />

            <button
              type="button"
              onClick={() => !savingImageSlot && setImagePickerSlot('cover')}
              disabled={savingImageSlot !== null}
              className="absolute right-4 top-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.14em] text-ink-700 shadow-soft transition hover:bg-coral-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Camera className="h-4 w-4" />
              {savingImageSlot === 'cover' ? 'Salvando...' : 'Trocar capa'}
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
              <button
                type="button"
                onClick={() => !savingImageSlot && setImagePickerSlot('logo')}
                disabled={savingImageSlot !== null}
                className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-soft transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                title="Trocar logo"
              >
                {draftStore.logoImageUrl ? (
                  <img src={draftStore.logoImageUrl} alt={draftStore.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-ink-700">{draftStore.name.slice(0, 1)}</span>
                )}
                <span className="absolute bottom-1 right-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink-700 shadow-soft transition group-hover:bg-coral-500 group-hover:text-white">
                  {savingImageSlot === 'logo' ? (
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-ink-300 border-t-coral-500" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </span>
              </button>
              <div className="min-w-0">
                <h3 className="text-[28px] font-bold tracking-[-0.04em] text-ink-900">{draftStore.name}</h3>
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
            <div className="relative">
              <select
                value={draftStore.categoryId}
                onChange={(event) => {
                  const cat = categories.find((c) => c.id === event.target.value)
                  handleStorePatch({ categoryId: event.target.value, categoryName: cat?.name ?? '' })
                }}
                className="h-12 w-full appearance-none rounded-2xl border border-ink-100 bg-white px-4 pr-10 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400 cursor-pointer"
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
            </div>
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

          <div className="rounded-2xl border border-ink-100 bg-white px-4 py-3 sm:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-ink-900">Loja ativa</p>
                <p className="mt-1 text-sm text-ink-500">Controla se a operacao aparece como ativa no painel.</p>
              </div>
              <ThemeSwitch
                checked={draftStore.active}
                onChange={(nextValue) => handleStorePatch({ active: nextValue })}
                ariaLabel="Alternar loja ativa"
                disabled={!canActivate && !draftStore.active}
              />
            </div>
            {!canActivate && (
              <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-semibold text-amber-700">Para ativar a loja, preencha:</p>
                <ul className="mt-1.5 space-y-0.5">
                  {blockers.map((b) => (
                    <li key={b} className="text-xs text-amber-600">• {b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSaveStore()}
            disabled={!hasChanges || isSaving}
            className={[
              'inline-flex h-11 items-center justify-center rounded-2xl px-8 text-sm font-semibold text-white transition',
              hasChanges && !isSaving
                ? 'bg-coral-500 hover:bg-coral-600'
                : 'cursor-not-allowed bg-ink-200 text-ink-500',
            ].join(' ')}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </article>
    </div>
    </>
  )
}

const inputAddressClass =
  'h-12 w-full rounded-2xl border border-ink-100 bg-white px-4 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400'

function StoreAddressTab() {
  const { data } = usePartnerPageData()
  const { updateStore } = usePartnerDraftStore()
  const [draft, setDraft] = useState<PartnerStore>(data.store)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => { setDraft(data.store) }, [data.store])

  function patch(p: Partial<PartnerStore>) {
    setDraft((cur) => ({ ...cur, ...p }))
  }

  const hasChanges = hasStoreAddressChanges(draft, data.store)

  async function handleSave() {
    if (!hasChanges || isSaving) return

    setIsSaving(true)
    try {
      await saveStore(data.store.id, draft)
      updateStore(data.store.id, draft)
      toast.success('Endereco salvo com sucesso.')
    } catch {
      toast.error('Nao foi possivel salvar. Tente novamente.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
      <article className="panel-card p-6">
        <p className="text-sm font-semibold text-ink-900">Endereco operacional</p>
        <p className="mt-1 text-sm text-ink-500">Endereco fisico da loja exibido para os clientes.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Rua</span>
            <input
              type="text"
              value={draft.addressStreet}
              onChange={(e) => patch({ addressStreet: e.target.value })}
              placeholder="Nome da rua ou avenida"
              className={inputAddressClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Numero</span>
            <input
              type="text"
              value={draft.addressNumber}
              onChange={(e) => patch({ addressNumber: e.target.value })}
              placeholder="123"
              className={inputAddressClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Complemento</span>
            <input
              type="text"
              value={draft.addressComplement}
              onChange={(e) => patch({ addressComplement: e.target.value })}
              placeholder="Sala, andar, bloco..."
              className={inputAddressClass}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Bairro</span>
            <input
              type="text"
              value={draft.addressNeighborhood}
              onChange={(e) => patch({ addressNeighborhood: e.target.value })}
              placeholder="Bairro"
              className={inputAddressClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Cidade</span>
            <input
              type="text"
              value={draft.addressCity}
              onChange={(e) => patch({ addressCity: e.target.value })}
              placeholder="Cidade"
              className={inputAddressClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Estado</span>
            <input
              type="text"
              value={draft.addressState}
              onChange={(e) => patch({ addressState: e.target.value })}
              placeholder="SP"
              maxLength={2}
              className={inputAddressClass}
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">CEP</span>
            <input
              type="text"
              value={draft.addressZip}
              onChange={(e) => patch({ addressZip: e.target.value })}
              placeholder="00000-000"
              className={inputAddressClass}
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={!hasChanges || isSaving}
            className={[
              'inline-flex h-11 items-center justify-center rounded-2xl px-8 text-sm font-semibold text-white transition',
              hasChanges && !isSaving
                ? 'bg-coral-500 hover:bg-coral-600'
                : 'cursor-not-allowed bg-ink-200 text-ink-500',
            ].join(' ')}
          >
            {isSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </article>

      <article className="panel-card p-6">
        <p className="text-sm font-semibold text-ink-900">Ponto no mapa</p>
        <p className="mt-1 text-sm text-ink-500">Mova o mapa para ajustar a posicao exata da loja.</p>
        <div className="mt-4">
          <MapPicker
            lat={draft.lat}
            lng={draft.lng}
            onChange={(lat, lng) => patch({ lat, lng })}
            height={440}
          />
        </div>
      </article>
    </div>
  )
}

function StoreAccessTab() {
  const { data } = usePartnerPageData()
  const storeId = data.store.id

  const [members, setMembers] = useState<StoreMember[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('operador')
  const [inviting, setInviting] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchStoreMembers(storeId)
      .then(setMembers)
      .catch(() => toast.error('Nao foi possivel carregar os membros.'))
      .finally(() => setLoading(false))
  }, [storeId])

  async function handleInvite() {
    const email = inviteEmail.trim().toLowerCase()
    if (!email || inviting) return

    // Não pode convidar o próprio dono
    if (email === data.profile.email.toLowerCase()) {
      toast.error('Voce ja e o responsavel principal desta loja.')
      return
    }

    setInviting(true)
    try {
      const member = await inviteStoreMember(storeId, email, inviteRole)
      setMembers((prev) => {
        const exists = prev.find((m) => m.id === member.id)
        return exists ? prev.map((m) => (m.id === member.id ? member : m)) : [member, ...prev]
      })
      setInviteEmail('')
      toast.success(`Convite enviado para ${email}.`)
    } catch {
      toast.error('Nao foi possivel convidar. Verifique o email e tente novamente.')
    } finally {
      setInviting(false)
    }
  }

  async function handleChangeRole(member: StoreMember, role: MemberRole) {
    try {
      const updated = await updateStoreMember(member.id, storeId, { role })
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      toast.success('Funcao atualizada.')
    } catch {
      toast.error('Nao foi possivel atualizar.')
    }
    setOpenMenuId(null)
  }

  async function handleToggleStatus(member: StoreMember) {
    const nextStatus = member.status === 'inativo' ? 'ativo' : 'inativo'
    try {
      const updated = await updateStoreMember(member.id, storeId, { status: nextStatus })
      setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)))
      toast.success(nextStatus === 'ativo' ? 'Acesso reativado.' : 'Acesso suspenso.')
    } catch {
      toast.error('Nao foi possivel atualizar.')
    }
    setOpenMenuId(null)
  }

  async function handleRemove(member: StoreMember) {
    try {
      await removeStoreMember(member.id, storeId)
      setMembers((prev) => prev.filter((m) => m.id !== member.id))
      toast.success('Membro removido.')
    } catch {
      toast.error('Nao foi possivel remover.')
    }
    setOpenMenuId(null)
  }

  function statusBadge(status: StoreMember['status']) {
    if (status === 'ativo') return 'bg-green-50 text-green-700'
    if (status === 'pendente') return 'bg-amber-50 text-amber-700'
    return 'bg-ink-100 text-ink-500'
  }

  function statusLabel(status: StoreMember['status']) {
    if (status === 'ativo') return 'Ativo'
    if (status === 'pendente') return 'Pendente'
    return 'Inativo'
  }

  function roleLabel(role: MemberRole) {
    if (role === 'administrador') return 'Administrador'
    if (role === 'gerente') return 'Gerente'
    if (role === 'financeiro') return 'Financeiro'
    return 'Operador'
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">

      {/* Responsável principal */}
      <div className="flex flex-col gap-4">
        <article className="panel-card p-6">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-coral-500" />
            <p className="text-sm font-semibold text-ink-900">Responsavel principal</p>
          </div>
          <div className="mt-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral-500 text-sm font-bold text-white">
                {(data.profile.name || data.profile.email).slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">{data.profile.name || '—'}</p>
                <p className="truncate text-xs text-ink-500">{data.profile.email}</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <MiniInfoCard label="Funcao" value="Proprietario" />
              <MiniInfoCard label="Loja" value={data.store.name} />
            </div>
          </div>
        </article>

        {/* Convidar novo membro */}
        <article className="panel-card p-6">
          <div className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-coral-500" />
            <p className="text-sm font-semibold text-ink-900">Convidar membro</p>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            Adicione operadores ou gerentes que terao acesso ao painel desta loja.
          </p>

          <div className="mt-4 space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Email</span>
              <div className="flex items-center gap-2 rounded-2xl border border-ink-100 bg-white px-3 focus-within:border-coral-400">
                <Mail className="h-4 w-4 shrink-0 text-ink-400" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && void handleInvite()}
                  placeholder="email@exemplo.com"
                  className="h-11 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-300"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-ink-500">Funcao</span>
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as MemberRole)}
                  className="h-11 w-full appearance-none rounded-2xl border border-ink-100 bg-white px-4 pr-10 text-sm font-semibold text-ink-900 outline-none transition focus:border-coral-400 cursor-pointer"
                >
                  <option value="operador">Operador — visualiza e gerencia pedidos</option>
                  <option value="gerente">Gerente — acesso completo exceto financeiro</option>
                  <option value="financeiro">Financeiro — acesso ao modulo financeiro</option>
                  <option value="administrador">Administrador — acesso total a loja</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
              </div>
            </label>

            <button
              type="button"
              onClick={() => void handleInvite()}
              disabled={!inviteEmail.trim() || inviting}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-coral-500 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              {inviting ? 'Convidando...' : 'Enviar convite'}
            </button>
          </div>
        </article>
      </div>

      {/* Lista de membros */}
      <article className="panel-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">Membros da equipe</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {members.length === 0 ? 'Nenhum membro convidado ainda.' : `${members.length} membro${members.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 flex items-center justify-center py-10">
            <p className="text-sm text-ink-400">Carregando...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ink-200 py-10 text-center">
            <UserCheck className="h-8 w-8 text-ink-200" />
            <p className="text-sm text-ink-400">Nenhum membro ainda.</p>
            <p className="text-xs text-ink-300">Convide operadores ou gerentes pelo formulario ao lado.</p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-ink-100">
            {members.map((member) => (
              <div key={member.id} className="flex items-center gap-3 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
                  {(member.name || member.email).slice(0, 1).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {member.name || member.email}
                    </p>
                    <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', statusBadge(member.status))}>
                      {statusLabel(member.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs text-ink-500">{member.email}</p>
                    <span className="shrink-0 text-[10px] font-semibold text-ink-400">· {roleLabel(member.role)}</span>
                  </div>
                </div>

                {/* Menu de ações */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
                    aria-label="Opcoes do membro"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {openMenuId === member.id && (
                    <div className="absolute right-0 top-9 z-20 w-48 rounded-2xl border border-ink-100 bg-white py-1 shadow-float">
                      {/* Trocar função */}
                      {(['operador', 'gerente', 'financeiro', 'administrador'] as MemberRole[])
                        .filter((r) => r !== member.role)
                        .map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => void handleChangeRole(member, r)}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                          >
                            <Shield className="h-4 w-4 text-ink-400" />
                            {r === 'administrador' ? 'Definir como Administrador'
                              : r === 'gerente' ? 'Definir como Gerente'
                              : r === 'financeiro' ? 'Definir como Financeiro'
                              : 'Definir como Operador'}
                          </button>
                        ))}

                      {/* Suspender / Reativar */}
                      {member.status !== 'pendente' && (
                        <button
                          type="button"
                          onClick={() => void handleToggleStatus(member)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                        >
                          {member.status === 'inativo' ? (
                            <><UserCheck className="h-4 w-4 text-green-500" />Reativar acesso</>
                          ) : (
                            <><UserX className="h-4 w-4 text-amber-500" />Suspender acesso</>
                          )}
                        </button>
                      )}

                      <div className="my-1 border-t border-ink-100" />

                      {/* Remover */}
                      <button
                        type="button"
                        onClick={() => void handleRemove(member)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-coral-600 hover:bg-coral-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover membro
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
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
