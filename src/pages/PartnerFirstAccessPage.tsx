import React, { type ReactNode, useEffect, useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronDown, Circle, Clock3, Loader2, LogOut, MapPinned, ShoppingBag, Sparkles, Store, WalletCards } from 'lucide-react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { PaymentMethodsEditor } from '@/components/partner/PaymentMethodsEditor'
import { RadiusDeliveryMap, type RadiusZone } from '@/components/partner/RadiusDeliveryMap'
import { weekDays } from '@/components/partner/PartnerUi'
import { PartnerCatalogPage } from '@/pages/app/PartnerCatalogPage'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { useMinimumLoading } from '@/hooks/useMinimumLoading'
import { buildDefaultPaymentMethods, hasActivePaymentMethods } from '@/lib/paymentMethods'
import { getStoreCategories } from '@/services/profile'
import { formatTime } from '@/lib/utils'
import {
  createProduct,
  createProductCategory,
  initializeStoreHours,
  saveDeliveryArea,
  saveStorePaymentMethods,
  saveStore,
  saveStoreHours,
} from '@/services/partner'
import type { DeliveryArea, PartnerCategory, PartnerHour, PartnerProduct, PartnerStore, PaymentMethodItem, StoreCategory } from '@/types'

type FirstAccessStepId = 'boasvindas' | 'loja' | 'horarios' | 'entrega' | 'pagamentos' | 'produto'

type ProductDraft = {
  categoryId: string
  name: string
  description: string
  price: string
}

const STEPS: Array<{ id: FirstAccessStepId; label: string; icon: React.ElementType }> = [
  { id: 'boasvindas', label: 'Boas-vindas', icon: Sparkles },
  { id: 'loja', label: 'Loja', icon: Store },
  { id: 'horarios', label: 'Horarios', icon: Clock3 },
  { id: 'entrega', label: 'Entrega', icon: MapPinned },
  { id: 'pagamentos', label: 'Pagamentos', icon: WalletCards },
  { id: 'produto', label: 'Primeiro produto', icon: ShoppingBag },
]

const inputClass =
  'h-[48px] w-full rounded-xl border border-[#d9d9d9] bg-[#fbfbfb] px-4 text-[14px] text-[#1d1d1d] outline-none transition placeholder:text-[#9a9a9a] focus:border-[#ea1d2c] focus:bg-white focus:shadow-[0_0_0_4px_rgba(234,29,44,0.09)]'

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

function isDeliveryStepValid(zones: RadiusZone[]) {
  return zones.length > 0 && zones.every((z) => z.radiusKm > 0)
}

function isPaymentStepValid(methods: PaymentMethodItem[]) {
  return hasActivePaymentMethods(methods)
}

function isProductStepValid(product: ProductDraft) {
  return Boolean(product.name.trim() && parseCurrencyNumber(product.price) > 0)
}

export function PartnerFirstAccessPage() {
  const navigate = useNavigate()
  const { selectedStoreId, signOut } = usePartnerAuth()
  const { data, loading, error } = usePartnerDashboard(selectedStoreId)
  const showLoading = useMinimumLoading(loading)
  const [activeStep, setActiveStep] = useState(0)
  const [availableCategories, setAvailableCategories] = useState<StoreCategory[]>([])
  const [storeDraft, setStoreDraft] = useState<PartnerStore | null>(null)
  const [hoursDraft, setHoursDraft] = useState<PartnerHour[]>([])
  const [deliveryAreasDraft, setDeliveryAreasDraft] = useState<DeliveryArea[]>([])
  const [paymentMethodsDraft, setPaymentMethodsDraft] = useState<PaymentMethodItem[]>(buildDefaultPaymentMethods())
  const [productCategoriesDraft, setProductCategoriesDraft] = useState<PartnerCategory[]>([])
  const [productsDraft, setProductsDraft] = useState<PartnerProduct[]>([])
  const [radiusZones, setRadiusZones] = useState<RadiusZone[]>([
    { id: crypto.randomUUID(), radiusKm: 3, fee: 0, color: '#ea1d2c' },
  ])
  const [mapLat, setMapLat] = useState<number | null>(null)
  const [mapLng, setMapLng] = useState<number | null>(null)
  const [productDraft, setProductDraft] = useState<ProductDraft>({
    categoryId: '',
    name: '',
    description: '',
    price: '',
  })
  const [savedSteps, setSavedSteps] = useState({
    boasvindas: false,
    loja: false,
    horarios: false,
    entrega: false,
    pagamentos: false,
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
    setPaymentMethodsDraft(data.paymentMethods.length > 0 ? data.paymentMethods : buildDefaultPaymentMethods())
    setProductCategoriesDraft(data.categories)
    setProductsDraft(data.products)

    if (data.store.lat !== null) setMapLat(data.store.lat)
    if (data.store.lng !== null) setMapLng(data.store.lng)

    if (data.deliveryAreas.length > 0) {
      setRadiusZones(
        data.deliveryAreas.map((area, i) => ({
          id: area.id || crypto.randomUUID(),
          radiusKm: Number(area.etaLabel.replace(/[^0-9.]/g, '')) || (i + 1) * 3,
          fee: area.fee,
          color: ['#ea1d2c', '#f97316', '#eab308'][i] ?? '#ea1d2c',
        }))
      )
    }

    setProductDraft({
      categoryId: data.categories[0]?.id ?? '',
      name: '',
      description: '',
      price: '',
    })

    setSavedSteps({
      boasvindas: false,
      loja: isStoreStepValid(data.store),
      horarios: isHoursStepValid(data.hours),
      entrega: data.deliveryAreas.some((area) => area.active),
      pagamentos: isPaymentStepValid(data.paymentMethods),
      produto: data.products.some((product) => product.active),
    })
  }, [data])

  if (showLoading) {
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
  const currentStepId = STEPS[activeStep]?.id ?? 'boasvindas'
  const storeStepComplete = savedSteps.loja && isStoreStepValid(currentStore)
  const hoursStepComplete = savedSteps.horarios && isHoursStepValid(hoursDraft)
  const deliveryStepComplete = savedSteps.entrega && deliveryAreasDraft.length > 0
  const paymentStepComplete = savedSteps.pagamentos && isPaymentStepValid(paymentMethodsDraft)
  const productStepComplete = savedSteps.produto && productsDraft.some((product) => product.active)

  const completedMap: Record<FirstAccessStepId, boolean> = {
    boasvindas: activeStep > 0,
    loja: storeStepComplete,
    horarios: hoursStepComplete,
    entrega: deliveryStepComplete,
    pagamentos: paymentStepComplete,
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

  function updateProductField<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setProductDraft((current) => ({ ...current, [key]: value }))
    setSavedSteps((current) => ({ ...current, produto: false }))
  }

  async function handleSaveStoreStep(): Promise<boolean> {
    if (!isStoreStepValid(currentStore)) {
      toast.error('Preencha nome, categoria e descricao da loja.')
      return false
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
      return true
    } catch {
      toast.error('Nao foi possivel salvar os dados da loja.')
      return false
    } finally {
      setSavingStep(null)
    }
  }

  async function handleSaveHoursStep(): Promise<boolean> {
    if (!isHoursStepValid(hoursDraft)) {
      toast.error('Defina pelo menos um horario de funcionamento.')
      return false
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
      return true
    } catch {
      toast.error('Nao foi possivel salvar os horarios.')
      return false
    } finally {
      setSavingStep(null)
    }
  }

  async function handleSaveDeliveryStep(): Promise<boolean> {
    if (!isDeliveryStepValid(radiusZones)) {
      toast.error('Defina pelo menos um raio de entrega.')
      return false
    }

    setSavingStep('entrega')
    try {
      // Save store location
      if (mapLat !== null && mapLng !== null) {
        await saveStore(dashboardData.store.id, { lat: mapLat, lng: mapLng })
      }

      // Save each zone as a delivery area
      const saved = await Promise.all(
        radiusZones.map((zone, i) =>
          saveDeliveryArea(dashboardData.store.id, {
            id: deliveryAreasDraft[i]?.id || undefined,
            name: `Zona ${i + 1}`,
            etaLabel: `${zone.radiusKm} km`,
            fee: zone.fee,
            active: true,
          })
        )
      )

      setDeliveryAreasDraft(saved)
      setSavedSteps((current) => ({ ...current, entrega: true }))
      toast.success('Raios de entrega salvos.')
      return true
    } catch {
      toast.error('Nao foi possivel salvar os raios de entrega.')
      return false
    } finally {
      setSavingStep(null)
    }
  }

  async function handleSaveProductStep(): Promise<boolean> {
    // O catalogo gerencia seus proprios produtos. So verificamos se ja existe ao menos 1 produto ativo.
    if (dashboardData.products.some((p) => p.active) || productsDraft.some((p) => p.active)) {
      setSavedSteps((current) => ({ ...current, produto: true }))
      return true
    }
    toast.error('Cadastre ao menos um produto ativo no catalogo antes de concluir.')
    return false
  }

  async function handleSavePaymentStep(): Promise<boolean> {
    if (!isPaymentStepValid(paymentMethodsDraft)) {
      toast.error('Ative pelo menos uma forma de pagamento.')
      return false
    }

    setSavingStep('pagamentos')
    try {
      const savedMethods = await saveStorePaymentMethods(dashboardData.store.id, paymentMethodsDraft)
      setPaymentMethodsDraft(savedMethods)
      setSavedSteps((current) => ({ ...current, pagamentos: true }))
      toast.success('Formas de pagamento salvas.')
      return true
    } catch {
      toast.error('Nao foi possivel salvar as formas de pagamento.')
      return false
    } finally {
      setSavingStep(null)
    }
  }

  async function handleSaveAndNext() {
    if (currentStepId === 'boasvindas') {
      goNext()
      return
    }

    const saveMap: Record<Exclude<FirstAccessStepId, 'boasvindas'>, () => Promise<boolean>> = {
      loja: handleSaveStoreStep,
      horarios: handleSaveHoursStep,
      entrega: handleSaveDeliveryStep,
      pagamentos: handleSavePaymentStep,
      produto: handleSaveProductStep,
    }
    const ok = await saveMap[currentStepId]()
    if (!ok) return
    if (activeStep < STEPS.length - 1) {
      goNext()
    } else {
      void handleFinishFirstAccess()
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
    if (currentStepId === 'boasvindas') {
      return (
        <div className="flex-1 rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex h-full flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-[24px] bg-[#fff1f2] text-[#ea1d2c]">
                <Sparkles className="h-8 w-8" />
              </div>

              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-[#ea1d2c]">
                  Primeiro acesso
                </p>
                <h1 className="mt-3 text-[34px] font-black leading-tight tracking-[-0.04em] text-[#1d1d1d]">
                  Boas-vindas ao painel da sua loja
                </h1>
                <p className="mt-4 max-w-3xl text-[15px] leading-7 text-[#666]">
                  Vamos configurar os pontos principais da operacao para sua loja entrar no ar com
                  tudo pronto: dados da loja, horarios, entrega, pagamentos e o primeiro produto.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {[
                  'Revise as informacoes da loja antes de publicar.',
                  'Defina horarios e areas de entrega no mesmo fluxo.',
                  'Ative pagamentos e finalize com o primeiro produto.',
                ].map((item) => (
                  <div key={item} className="rounded-3xl border border-[#ececec] bg-[#fafafa] p-5">
                    <p className="text-[14px] font-semibold leading-6 text-[#1d1d1d]">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-[#ececec] bg-[#fafafa] p-6">
              <p className="text-[14px] font-bold text-[#1d1d1d]">Como funciona</p>
              <p className="mt-2 text-[14px] leading-6 text-[#666]">
                Sao algumas etapas rapidas. Quando tudo estiver salvo, o painel libera a operacao
                completa da loja automaticamente.
              </p>
            </div>
          </div>
        </div>
      )
    }

    if (currentStepId === 'loja') {
      return (
        <div className="flex-1 rounded-2xl bg-white p-8 shadow-sm space-y-5">
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

        </div>
      )
    }

    if (currentStepId === 'horarios') {
      return (
        <div className="flex-1 rounded-2xl bg-white p-6 shadow-sm space-y-5">
          <div>
            <h2 className="text-[18px] font-bold text-[#1d1d1d]">Horarios de funcionamento</h2>
            <p className="text-[13px] text-[#8b8b8b] mt-1">Defina quando sua loja atende durante a semana.</p>
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
        <div className="flex-1 rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#1d1d1d]">Raio de entrega</h2>
            <p className="text-[13px] text-[#8b8b8b] mt-1">
              Posicione o mapa na sua loja, defina o raio de alcance e o valor do frete. Voce pode adicionar ate 3 zonas com valores diferentes.
            </p>
          </div>
          <RadiusDeliveryMap
            lat={mapLat}
            lng={mapLng}
            zones={radiusZones}
            onZonesChange={(zones) => {
              setRadiusZones(zones)
              setSavedSteps((current) => ({ ...current, entrega: false }))
            }}
            onLocationChange={(lat, lng) => {
              setMapLat(lat)
              setMapLng(lng)
            }}
          />
        </div>
      )
    }

    if (currentStepId === 'pagamentos') {
      return (
        <div className="flex-1 rounded-2xl bg-white p-6 shadow-sm space-y-4">
          <div>
            <h2 className="text-[18px] font-bold text-[#1d1d1d]">Formas de pagamento</h2>
            <p className="text-[13px] text-[#8b8b8b] mt-1">
              Ative os meios de pagamento da loja e marque as bandeiras de cartao mais usadas que voce aceita.
            </p>
          </div>

          <PaymentMethodsEditor
            methods={paymentMethodsDraft}
            onChange={(methods) => {
              setPaymentMethodsDraft(methods)
              setSavedSteps((current) => ({ ...current, pagamentos: false }))
            }}
            helperText="Voce pode comecar com as bandeiras mais usadas e ajustar o restante depois sem sair do painel."
          />
        </div>
      )
    }

    return (
      <div className="flex-1 flex flex-col">
        <PartnerCatalogPage
          externalData={dashboardData}
          embedded
          onProductsChange={(products) => {
            setProductsDraft(products)
            setSavedSteps((current) => ({
              ...current,
              produto: products.some((product) => product.active),
            }))
          }}
        />
      </div>
    )
  }

  const sidebarFooter = (
    <div className="border-t border-ink-100 px-4 py-4 space-y-2">
      {activeStep < STEPS.length - 1 ? (
        <button
          type="button"
          onClick={() => void handleSaveAndNext()}
          disabled={savingStep !== null}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[13px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingStep !== null ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
          ) : currentStepId === 'boasvindas' ? (
            <>Comecar configuracao <ArrowRight className="h-4 w-4" /></>
          ) : (
            <>Salvar e proximo <ArrowRight className="h-4 w-4" /></>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => void handleSaveAndNext()}
          disabled={savingStep !== null || finishing}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[13px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {savingStep !== null || finishing ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>
          ) : (
            'Salvar e concluir'
          )}
        </button>
      )}
      <button
        type="button"
        onClick={() => (activeStep === 0 ? navigate('/lojas') : setActiveStep((current) => current - 1))}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-ink-100 text-[13px] font-semibold text-ink-600 transition hover:bg-ink-50"
      >
        {activeStep === 0 ? 'Voltar para lojas' : 'Voltar'}
      </button>
      <button
        type="button"
        onClick={() => void signOut()}
        className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl text-[13px] font-semibold text-ink-500 transition hover:bg-ink-50"
      >
        <LogOut className="h-4 w-4" />
        Sair
      </button>
    </div>
  )

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-[#f5f5f5]">
      {/* 1600×823 box, centered */}
      <div className="flex gap-4 p-4" style={{ width: 1600, height: 823 }}>

        {/* Sidebar — igual panel-card do app */}
        <aside className="panel-card flex h-full w-[260px] shrink-0 flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b border-ink-100 px-5 pb-4 pt-5 shrink-0">
            <p className="font-display text-lg font-bold text-coral-500">oh! Delivery</p>
            <p className="text-sm text-ink-500">{currentStore.name}</p>
          </div>

          {/* Label */}
          <div className="px-5 pt-5 pb-2 shrink-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-ink-400">Configuracao inicial</p>
          </div>

          {/* Steps nav */}
          <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = index === activeStep
              const isDone = completedMap[step.id]
              const isReachable = index === 0 || completedMap[STEPS[index - 1]!.id]

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => isReachable && setActiveStep(index)}
                  disabled={!isReachable}
                  className={[
                    'sidebar-link w-full gap-3 text-left',
                    isActive ? 'sidebar-link-active' : '',
                    !isReachable ? 'cursor-not-allowed opacity-40' : '',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="flex-1 text-[14px]">{step.label}</span>
                  {isDone ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 shrink-0 text-ink-300" />
                  )}
                </button>
              )
            })}
          </nav>

          {sidebarFooter}
        </aside>

        {/* Main content — scrollable */}
        <div className="flex flex-1 flex-col overflow-y-auto">
          {renderCurrentStep()}
        </div>

      </div>
    </div>
  )
}
