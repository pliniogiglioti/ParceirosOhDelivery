import { type ReactNode, useEffect, useState } from 'react'
import { ArrowRight, ChevronDown, Loader2, LogOut } from 'lucide-react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { weekDays } from '@/components/partner/PartnerUi'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { getStoreCategories } from '@/services/profile'
import { formatTime } from '@/lib/utils'
import {
  createProduct,
  createProductCategory,
  initializeStoreHours,
  saveDeliveryArea,
  saveStore,
  saveStoreHours,
} from '@/services/partner'
import type { DeliveryArea, PartnerCategory, PartnerHour, PartnerProduct, PartnerStore, StoreCategory } from '@/types'

type FirstAccessStepId = 'loja' | 'horarios' | 'entrega' | 'produto'

type ProductDraft = {
  categoryId: string
  name: string
  description: string
  price: string
}

const STEPS: Array<{ id: FirstAccessStepId; label: string }> = [
  { id: 'loja', label: 'Loja' },
  { id: 'horarios', label: 'Horarios' },
  { id: 'entrega', label: 'Entrega' },
  { id: 'produto', label: 'Primeiro produto' },
]

const inputClass =
  'h-[48px] w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]'

function StepperBar({ current }: { current: number }) {
  return (
    <div className="border-b border-[#ececec] bg-white px-4">
      <div className="mx-auto flex max-w-3xl overflow-x-auto">
        {STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`min-w-[140px] flex-1 border-b-2 py-3 text-center text-[13px] font-semibold transition-all ${
              index === current
                ? 'border-[#ea1d2c] text-[#ea1d2c]'
                : index < current
                ? 'border-transparent text-[#686868]'
                : 'border-transparent text-[#bbb]'
            }`}
          >
            {step.label}
          </div>
        ))}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-[#4f4f4f]">{label}</span>
      {children}
    </label>
  )
}

function normalizeTimeValue(value: string) {
  return value.length === 5 ? `${value}:00` : value.slice(0, 8)
}

function parseCurrencyNumber(value: string) {
  const normalized = value.replace(',', '.').trim()
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function isStoreStepValid(store: PartnerStore) {
  return Boolean(store.name.trim() && store.categoryId && store.description.trim())
}

function isHoursStepValid(hours: PartnerHour[]) {
  return hours.some((hour) => !hour.isClosed && hour.opensAt && hour.closesAt)
}

function isDeliveryStepValid(area: DeliveryArea) {
  return Boolean(area.name.trim() && area.etaLabel.trim() && area.active)
}

function isProductStepValid(product: ProductDraft) {
  return Boolean(product.name.trim() && parseCurrencyNumber(product.price) > 0)
}

export function PartnerFirstAccessPage() {
  const navigate = useNavigate()
  const { selectedStoreId, signOut } = usePartnerAuth()
  const { data, loading, error } = usePartnerDashboard(selectedStoreId)
  const [activeStep, setActiveStep] = useState(0)
  const [availableCategories, setAvailableCategories] = useState<StoreCategory[]>([])
  const [storeDraft, setStoreDraft] = useState<PartnerStore | null>(null)
  const [hoursDraft, setHoursDraft] = useState<PartnerHour[]>([])
  const [deliveryAreasDraft, setDeliveryAreasDraft] = useState<DeliveryArea[]>([])
  const [productCategoriesDraft, setProductCategoriesDraft] = useState<PartnerCategory[]>([])
  const [productsDraft, setProductsDraft] = useState<PartnerProduct[]>([])
  const [deliveryDraft, setDeliveryDraft] = useState<DeliveryArea>({
    id: '',
    name: '',
    etaLabel: '',
    fee: 0,
    active: true,
  })
  const [productDraft, setProductDraft] = useState<ProductDraft>({
    categoryId: '',
    name: '',
    description: '',
    price: '',
  })
  const [savedSteps, setSavedSteps] = useState({
    loja: false,
    horarios: false,
    entrega: false,
    produto: false,
  })
  const [savingStep, setSavingStep] = useState<FirstAccessStepId | null>(null)
  const [finishing, setFinishing] = useState(false)

  useEffect(() => {
    void getStoreCategories().then(setAvailableCategories)
  }, [])

  useEffect(() => {
    if (!data) return

    setStoreDraft(data.store)

    if (data.hours.length === 0) {
      void initializeStoreHours(data.store.id).then((created) => {
        setHoursDraft(created)
      })
    } else {
      setHoursDraft(data.hours)
    }

    setDeliveryAreasDraft(data.deliveryAreas)
    setProductCategoriesDraft(data.categories)
    setProductsDraft(data.products)

    const firstArea = data.deliveryAreas[0]
    setDeliveryDraft(
      firstArea ?? {
        id: '',
        name: '',
        etaLabel: '',
        fee: 0,
        active: true,
      }
    )

    setProductDraft({
      categoryId: data.categories[0]?.id ?? '',
      name: '',
      description: '',
      price: '',
    })

    setSavedSteps({
      loja: isStoreStepValid(data.store),
      horarios: isHoursStepValid(data.hours),
      entrega: data.deliveryAreas.some((area) => area.active),
      produto: data.products.some((product) => product.active),
    })
  }, [data])

  if (loading) {
    return <LoadingScreen />
  }

  if (!selectedStoreId) {
    return <Navigate to="/lojas" replace />
  }

  if (!data || !storeDraft) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f5f5] px-4">
        <div className="w-full max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm">
          <p className="text-xl font-bold text-[#1d1d1d]">Nao foi possivel carregar o primeiro acesso.</p>
          <p className="mt-3 text-sm leading-6 text-[#686868]">
            {error ?? 'Tente novamente em alguns instantes.'}
          </p>
        </div>
      </div>
    )
  }

  if (data.store.firstAccess) {
    return <Navigate to="/app" replace />
  }

  const dashboardData = data
  const currentStore = storeDraft
  const currentStepId = STEPS[activeStep]?.id ?? 'loja'
  const storeStepComplete = savedSteps.loja && isStoreStepValid(currentStore)
  const hoursStepComplete = savedSteps.horarios && isHoursStepValid(hoursDraft)
  const deliveryStepComplete =
    savedSteps.entrega && deliveryAreasDraft.some((area) => area.active && area.name.trim())
  const productStepComplete = savedSteps.produto && productsDraft.some((product) => product.active)

  const completedMap: Record<FirstAccessStepId, boolean> = {
    loja: storeStepComplete,
    horarios: hoursStepComplete,
    entrega: deliveryStepComplete,
    produto: productStepComplete,
  }

  const allStepsCompleted = Object.values(completedMap).every(Boolean)

  function updateStoreField<K extends keyof PartnerStore>(key: K, value: PartnerStore[K]) {
    setStoreDraft((current) => (current ? { ...current, [key]: value } : current))
    setSavedSteps((current) => ({ ...current, loja: false }))
  }

  function updateHourField(
    hourId: string,
    patch: {
      opensAt?: string
      closesAt?: string
      isClosed?: boolean
    }
  ) {
    setHoursDraft((current) =>
      current.map((hour) =>
        hour.id === hourId
          ? {
              ...hour,
              ...(patch.opensAt !== undefined ? { opensAt: normalizeTimeValue(patch.opensAt) } : {}),
              ...(patch.closesAt !== undefined ? { closesAt: normalizeTimeValue(patch.closesAt) } : {}),
              ...(patch.isClosed !== undefined ? { isClosed: patch.isClosed } : {}),
            }
          : hour
      )
    )
    setSavedSteps((current) => ({ ...current, horarios: false }))
  }

  function updateDeliveryField<K extends keyof DeliveryArea>(key: K, value: DeliveryArea[K]) {
    setDeliveryDraft((current) => ({ ...current, [key]: value }))
    setSavedSteps((current) => ({ ...current, entrega: false }))
  }

  function updateProductField<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setProductDraft((current) => ({ ...current, [key]: value }))
    setSavedSteps((current) => ({ ...current, produto: false }))
  }

  async function handleSaveStoreStep() {
    if (!isStoreStepValid(currentStore)) {
      toast.error('Preencha nome, categoria e descricao da loja.')
      return
    }

    setSavingStep('loja')
    try {
      await saveStore(dashboardData.store.id, {
        name: currentStore.name,
        categoryId: currentStore.categoryId,
        categoryName: currentStore.categoryName,
        description: currentStore.description,
      })
      setSavedSteps((current) => ({ ...current, loja: true }))
      toast.success('Dados da loja salvos.')
    } catch {
      toast.error('Nao foi possivel salvar os dados da loja.')
    } finally {
      setSavingStep(null)
    }
  }

  async function handleSaveHoursStep() {
    if (!isHoursStepValid(hoursDraft)) {
      toast.error('Defina pelo menos um horario de funcionamento.')
      return
    }

    setSavingStep('horarios')
    try {
      await saveStoreHours(
        dashboardData.store.id,
        hoursDraft.map((hour) => ({
          id: hour.id,
          opensAt: hour.opensAt,
          closesAt: hour.closesAt,
          isClosed: hour.isClosed,
        }))
      )
      setSavedSteps((current) => ({ ...current, horarios: true }))
      toast.success('Horarios salvos.')
    } catch {
      toast.error('Nao foi possivel salvar os horarios.')
    } finally {
      setSavingStep(null)
    }
  }

  async function handleSaveDeliveryStep() {
    if (!isDeliveryStepValid(deliveryDraft)) {
      toast.error('Preencha nome da area, prazo e mantenha a area ativa.')
      return
    }

    setSavingStep('entrega')
    try {
      const savedArea = await saveDeliveryArea(dashboardData.store.id, {
        id: deliveryDraft.id || undefined,
        name: deliveryDraft.name,
        etaLabel: deliveryDraft.etaLabel,
        fee: deliveryDraft.fee,
        active: deliveryDraft.active,
      })

      setDeliveryDraft(savedArea)
      setDeliveryAreasDraft((current) => {
        const existingIndex = current.findIndex((area) => area.id === savedArea.id)
        if (existingIndex === -1) return [savedArea, ...current]
        return current.map((area) => (area.id === savedArea.id ? savedArea : area))
      })
      setSavedSteps((current) => ({ ...current, entrega: true }))
      toast.success('Area de entrega salva.')
    } catch {
      toast.error('Nao foi possivel salvar a area de entrega.')
    } finally {
      setSavingStep(null)
    }
  }

  async function handleSaveProductStep() {
    if (!isProductStepValid(productDraft)) {
      toast.error('Preencha nome e preco do primeiro produto.')
      return
    }

    setSavingStep('produto')
    try {
      let categoryId = productDraft.categoryId
      let nextCategories = productCategoriesDraft

      if (!categoryId) {
        const createdCategory = await createProductCategory(dashboardData.store.id, {
          name: 'Primeiros itens',
          icon: 'MENU',
          template: 'padrao',
        })
        nextCategories = [...productCategoriesDraft, createdCategory]
        setProductCategoriesDraft(nextCategories)
        categoryId = createdCategory.id
      }

      const savedProduct = await createProduct(dashboardData.store.id, {
        categoryId,
        name: productDraft.name,
        description: productDraft.description,
        price: parseCurrencyNumber(productDraft.price),
      })

      setProductsDraft((current) => [...current, savedProduct])
      setProductDraft({
        categoryId: nextCategories[0]?.id ?? categoryId,
        name: '',
        description: '',
        price: '',
      })
      setSavedSteps((current) => ({ ...current, produto: true }))
      toast.success('Primeiro produto cadastrado.')
    } catch {
      toast.error('Nao foi possivel cadastrar o primeiro produto.')
    } finally {
      setSavingStep(null)
    }
  }

  async function handleFinishFirstAccess() {
    if (!allStepsCompleted || finishing) return

    setFinishing(true)
    try {
      await saveStore(dashboardData.store.id, { firstAccess: true })
      toast.success('Primeiro acesso concluido com sucesso.')
      navigate('/app', { replace: true })
    } catch {
      toast.error('Nao foi possivel concluir o primeiro acesso.')
    } finally {
      setFinishing(false)
    }
  }

  function goNext() {
    setActiveStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function renderCurrentStep() {
    if (currentStepId === 'loja') {
      return (
        <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5">
          <div>
            <h2 className="text-[18px] font-bold text-[#1d1d1d]">Dados da Loja</h2>
            <p className="text-[13px] text-[#8b8b8b] mt-1">Configure os dados basicos sem sair do primeiro acesso.</p>
          </div>

          <Field label="Nome da loja *">
            <input
              type="text"
              value={currentStore.name}
              onChange={(event) => updateStoreField('name', event.target.value)}
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Categoria *">
            <div className="relative">
              <select
                value={currentStore.categoryId}
                onChange={(event) => {
                  const category = availableCategories.find((item) => item.id === event.target.value)
                  updateStoreField('categoryId', event.target.value)
                  updateStoreField('categoryName', category?.name ?? '')
                }}
                className={`${inputClass} appearance-none pr-10 cursor-pointer`}
              >
                <option value="">Selecione uma categoria</option>
                {availableCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b8b8b]" />
            </div>
          </Field>

          <Field label="Descricao *">
            <textarea
              rows={4}
              value={currentStore.description}
              onChange={(event) => updateStoreField('description', event.target.value)}
              className="w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 py-3 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]"
              placeholder="Conte um pouco sobre a sua operacao."
            />
          </Field>

          <button
            type="button"
            onClick={() => void handleSaveStoreStep()}
            disabled={savingStep === 'loja'}
            className="h-[52px] w-full rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingStep === 'loja' ? 'Salvando...' : 'Salvar etapa'}
          </button>
        </div>
      )
    }

    if (currentStepId === 'horarios') {
      return (
        <div className="panel-card space-y-6 p-6 rounded-2xl bg-white shadow-sm">
          <div className="flex flex-col gap-3 rounded-3xl bg-ink-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink-900">Horarios de funcionamento</p>
              <p className="mt-1 text-sm text-ink-500">
                Defina quando sua loja atende durante a semana.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void handleSaveHoursStep()}
              disabled={savingStep === 'horarios'}
              className={[
                'inline-flex h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition',
                savingStep !== 'horarios'
                  ? 'bg-coral-500 text-white hover:bg-coral-600'
                  : 'cursor-not-allowed bg-ink-200 text-ink-500',
              ].join(' ')}
            >
              {savingStep === 'horarios' ? 'Salvando...' : 'Salvar etapa'}
            </button>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 md:grid-cols-7">
            {hoursDraft.map((hour) => (
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
      )
    }

    if (currentStepId === 'entrega') {
      return (
        <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5">
          <div>
            <h2 className="text-[18px] font-bold text-[#1d1d1d]">Range de entrega</h2>
            <p className="text-[13px] text-[#8b8b8b] mt-1">Cadastre a primeira area de entrega da loja.</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome da area *">
              <input
                type="text"
                value={deliveryDraft.name}
                onChange={(event) => updateDeliveryField('name', event.target.value)}
                className={inputClass}
                placeholder="Ex: Centro"
                autoFocus
              />
            </Field>

            <Field label="Prazo estimado *">
              <input
                type="text"
                value={deliveryDraft.etaLabel}
                onChange={(event) => updateDeliveryField('etaLabel', event.target.value)}
                className={inputClass}
                placeholder="Ex: 30-45 min"
              />
            </Field>

            <Field label="Taxa de entrega">
              <input
                type="number"
                min={0}
                step="0.01"
                value={deliveryDraft.fee}
                onChange={(event) => updateDeliveryField('fee', Number(event.target.value))}
                className={inputClass}
                placeholder="0,00"
              />
            </Field>

            <label className="block">
              <span className="mb-1.5 block text-[13px] font-semibold text-[#4f4f4f]">Status</span>
              <div className="flex h-[48px] items-center gap-2 rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 text-[14px] text-[#1d1d1d]">
                <input
                  type="checkbox"
                  checked={deliveryDraft.active}
                  onChange={(event) => updateDeliveryField('active', event.target.checked)}
                />
                Area ativa para entrega
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => void handleSaveDeliveryStep()}
            disabled={savingStep === 'entrega'}
            className="h-[52px] w-full rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingStep === 'entrega' ? 'Salvando...' : 'Salvar etapa'}
          </button>
        </div>
      )
    }

    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm space-y-5">
        <div>
          <h2 className="text-[18px] font-bold text-[#1d1d1d]">Primeiro produto</h2>
          <p className="text-[13px] text-[#8b8b8b] mt-1">Cadastre o primeiro item do cardapio sem sair do primeiro acesso.</p>
        </div>

        {productsDraft.some((product) => product.active) ? (
          <div className="rounded-xl border border-[#dcfce7] bg-[#f0fdf4] px-4 py-3">
            <p className="text-[14px] font-semibold text-[#166534]">Voce ja tem pelo menos um produto ativo cadastrado.</p>
            <p className="mt-1 text-[13px] text-[#15803d]">Se quiser, pode concluir o primeiro acesso quando as demais etapas tambem estiverem prontas.</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <div className="relative">
              <select
                value={productDraft.categoryId}
                onChange={(event) => updateProductField('categoryId', event.target.value)}
                className={`${inputClass} appearance-none pr-10 cursor-pointer`}
              >
                <option value="">Criar categoria automatica</option>
                {productCategoriesDraft.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8b8b8b]" />
            </div>
          </Field>

          <Field label="Nome do produto *">
            <input
              type="text"
              value={productDraft.name}
              onChange={(event) => updateProductField('name', event.target.value)}
              className={inputClass}
              placeholder="Ex: X-Burger"
              autoFocus
            />
          </Field>

          <Field label="Descricao">
            <textarea
              rows={4}
              value={productDraft.description}
              onChange={(event) => updateProductField('description', event.target.value)}
              className="w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 py-3 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]"
              placeholder="Descreva o primeiro item."
            />
          </Field>

          <Field label="Preco *">
            <input
              type="number"
              min={0}
              step="0.01"
              value={productDraft.price}
              onChange={(event) => updateProductField('price', event.target.value)}
              className={inputClass}
              placeholder="0,00"
            />
          </Field>
        </div>

        <button
          type="button"
          onClick={() => void handleSaveProductStep()}
          disabled={savingStep === 'produto'}
          className="h-[52px] w-full rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingStep === 'produto' ? 'Salvando...' : 'Salvar etapa'}
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <StepperBar current={activeStep} />

      <main className="mx-auto flex max-w-7xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#ea1d2c]">Primeiro acesso</p>
            <p className="mt-1 text-[14px] text-[#686868]">
              Loja: <span className="font-semibold text-[#1d1d1d]">{currentStore.name}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#d9d9d9] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#686868] transition hover:border-[#ea1d2c] hover:text-[#ea1d2c]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>

        {renderCurrentStep()}

        <div className="mt-4 rounded-2xl border border-[#ececec] bg-white px-4 py-4 shadow-sm">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8b8b8b]">Progresso geral</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-4">
            {STEPS.map((step) => (
              <div
                key={step.id}
                className={`rounded-xl px-3 py-2 text-center text-[12px] font-semibold ${
                  completedMap[step.id] ? 'bg-[#f0fdf4] text-[#166534]' : 'bg-[#fafafa] text-[#8b8b8b]'
                }`}
              >
                {step.label}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => (activeStep === 0 ? navigate('/lojas') : setActiveStep((current) => current - 1))}
            className="h-[52px] flex-1 rounded-2xl border border-[#d9d9d9] text-[14px] font-semibold text-[#303030] transition hover:bg-[#f5f5f5]"
          >
            {activeStep === 0 ? 'Voltar para lojas' : 'Voltar'}
          </button>

          {activeStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!completedMap[currentStepId]}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Proxima etapa
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleFinishFirstAccess()}
              disabled={!allStepsCompleted || finishing}
              className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {finishing ? <><Loader2 className="h-4 w-4 animate-spin" /> Finalizando...</> : 'Concluir primeiro acesso'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
