import { Bike, CheckCircle2, Clock, Loader2, Mail, MapPin, Plus, Star, Trash2, Zap } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MetricCard, SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { deleteStoreCourier, saveStoreCourier } from '@/services/partner'
import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { StoreCourier } from '@/types'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type Tab = 'proprios' | 'entregoh'

interface EntregoHCourier {
  profileId: string
  name: string
  city: string
  state: string
  serviceType: string
  equipmentType: string
  rating: number
  completedDeliveries: number
  available: boolean
  lat?: number
  lng?: number
}

function EntregoHTab({ storeCity, storeState }: { storeCity: string; storeState: string }) {
  const [cities, setCities] = useState<Array<{ city: string; state: string; count: number }>>([])
  const [selectedCity, setSelectedCity] = useState('')
  const [couriers, setCouriers] = useState<EntregoHCourier[]>([])
  const [loadingCities, setLoadingCities] = useState(false)
  const [loadingCouriers, setLoadingCouriers] = useState(false)

  // Carrega cidades disponíveis para EntregoH, sempre ativo no painel.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    setLoadingCities(true)

    void (async () => {
      try {
        // Busca cidades com entregadores aprovados ou pendentes disponíveis
        const { data } = await supabase!
          .from('courier_profiles')
          .select('address_city, address_state')
          .eq('available', true)
          .not('address_city', 'is', null)

        if (!data) return

        // Agrupa por cidade
        const cityMap = new Map<string, { city: string; state: string; count: number }>()
        data.forEach((row) => {
          const key = `${row.address_city}-${row.address_state}`
          const existing = cityMap.get(key)
          if (existing) existing.count++
          else cityMap.set(key, { city: row.address_city, state: row.address_state, count: 1 })
        })

        const sorted = [...cityMap.values()].sort((a, b) => {
          // Coloca a cidade da loja primeiro
          if (a.city === storeCity) return -1
          if (b.city === storeCity) return 1
          return b.count - a.count
        })

        setCities(sorted)

        // Auto-seleciona a cidade da loja se disponível
        const storeMatch = sorted.find((c) => c.city === storeCity)
        if (storeMatch) setSelectedCity(storeMatch.city)
        else if (sorted.length > 0) setSelectedCity(sorted[0].city)
      } finally {
        setLoadingCities(false)
      }
    })()
  }, [storeCity])

  // Carrega entregadores da cidade selecionada
  useEffect(() => {
    if (!selectedCity || !isSupabaseConfigured || !supabase) return
    setLoadingCouriers(true)
    setCouriers([])

    void (async () => {
      try {
        const { data: profiles } = await supabase!
          .from('courier_profiles')
          .select('profile_id, address_city, address_state, service_type, equipment_type, rating, completed_deliveries, available')
          .eq('address_city', selectedCity)
          .eq('available', true)
          .order('rating', { ascending: false })

        if (!profiles?.length) { setLoadingCouriers(false); return }

        // Busca localizações recentes
        const profileIds = profiles.map((p) => p.profile_id)
        const { data: locations } = await supabase!
          .from('courier_locations')
          .select('courier_id, latitude, longitude, updated_at')
          .in('courier_id', profileIds)

        // Busca nomes dos perfis
        const { data: profileData } = await supabase!
          .from('profiles')
          .select('id, name')
          .in('id', profileIds)

        const nameById = new Map((profileData ?? []).map((p) => [p.id, p.name]))
        const locById = new Map((locations ?? []).map((l) => [l.courier_id, l]))

        setCouriers(profiles.map((p) => ({
          profileId: p.profile_id,
          name: nameById.get(p.profile_id) ?? 'Entregador',
          city: p.address_city,
          state: p.address_state,
          serviceType: p.service_type ?? 'moto',
          equipmentType: p.equipment_type ?? 'bag',
          rating: Number(p.rating ?? 5),
          completedDeliveries: Number(p.completed_deliveries ?? 0),
          available: Boolean(p.available),
          lat: locById.get(p.profile_id)?.latitude,
          lng: locById.get(p.profile_id)?.longitude,
        })))
      } finally {
        setLoadingCouriers(false)
      }
    })()
  }, [selectedCity])

  function serviceLabel(type: string) {
    if (type === 'moto') return 'Moto'
    if (type === 'bike') return 'Bicicleta'
    if (type === 'car') return 'Carro'
    if (type === 'van') return 'Van'
    return type
  }

  function serviceIcon(type: string) {
    if (type === 'moto' || type === 'bike') return '🏍️'
    if (type === 'car') return '🚗'
    if (type === 'van') return '🚐'
    return '🛵'
  }

  return (
    <div className="space-y-4">
      {/* EntregoH sempre ativo */}
      <div className="panel-card p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-coral-50">
              <Zap className="h-5 w-5 text-coral-500" />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink-900">EntregoH! ativo</p>
              <p className="mt-0.5 text-xs text-ink-500">
                Contrate entregadores sob demanda da rede EntregoH diretamente pela plataforma
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ativo
          </span>
        </div>
      </div>

      <>
        {/* Seleção de cidade */}
        <div className="panel-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-coral-500" />
              <p className="text-sm font-semibold text-ink-900">Selecione a cidade</p>
            </div>
            {loadingCities ? (
              <div className="h-12 animate-pulse rounded-2xl bg-ink-100" />
            ) : cities.length === 0 ? (
              <p className="text-sm text-ink-400">Nenhuma cidade com entregadores disponíveis no momento.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {cities.map((c) => (
                  <button
                    key={c.city}
                    type="button"
                    onClick={() => setSelectedCity(c.city)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-2xl border px-4 py-2 text-sm font-semibold transition',
                      selectedCity === c.city
                        ? 'border-coral-300 bg-coral-50 text-coral-700'
                        : 'border-ink-100 bg-white text-ink-600 hover:bg-ink-50'
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    {c.city} — {c.state}
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                      selectedCity === c.city ? 'bg-coral-200 text-coral-800' : 'bg-ink-100 text-ink-500'
                    )}>
                      {c.count}
                    </span>
                    {c.city === storeCity && (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-bold text-green-700">sua cidade</span>
                    )}
                  </button>
                ))}
              </div>
            )}
        </div>

        {/* Lista de entregadores */}
        {selectedCity && (
          <div className="panel-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Entregadores disponíveis</p>
                  <p className="mt-0.5 text-xs text-ink-500">{selectedCity} · {couriers.length} ativo{couriers.length !== 1 ? 's' : ''}</p>
                </div>
              </div>

              {loadingCouriers ? (
                <div className="space-y-0 divide-y divide-ink-100">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-4">
                      <div className="h-11 w-11 animate-pulse rounded-2xl bg-ink-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-32 animate-pulse rounded-full bg-ink-100" />
                        <div className="h-3 w-48 animate-pulse rounded-full bg-ink-100" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : couriers.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <Bike className="h-8 w-8 text-ink-200" />
                  <p className="text-sm text-ink-400">Nenhum entregador disponível em {selectedCity} agora.</p>
                </div>
              ) : (
                <ul className="divide-y divide-ink-100">
                  {couriers.map((courier) => (
                    <li key={courier.profileId} className="flex items-center gap-4 px-5 py-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-coral-50 text-2xl">
                        {serviceIcon(courier.serviceType)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-ink-900">{courier.name}</p>
                          <span className="flex items-center gap-0.5 rounded-full bg-yellow-50 px-2 py-0.5 text-[11px] font-semibold text-yellow-700">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {courier.rating.toFixed(1)}
                          </span>
                          {courier.available && (
                            <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                              <CheckCircle2 className="h-3 w-3" />
                              Disponível
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {serviceLabel(courier.serviceType)} · {courier.completedDeliveries} entregas
                          {courier.lat && courier.lng ? ' · Localização ativa' : ''}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
          </div>
        )}
      </>
    </div>
  )
}

export function PartnerLogisticsPage() {
  const { data } = usePartnerPageData()
  const { updateCouriers, updateLogistics } = usePartnerDraftStore()
  const [couriers, setCouriers] = useState<StoreCourier[]>(data.couriers)
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('proprios')

  useEffect(() => {
    setCouriers(data.couriers)
  }, [data.couriers, data.store.id])

  async function handleAddCourier() {
    if (!isValidEmail(email)) {
      toast.error('Informe um e-mail valido para o entregador.')
      return
    }

    setSaving(true)

    try {
      const courier = await saveStoreCourier(data.store.id, email)
      const alreadyExists = couriers.some((item) => item.id === courier.id || item.email === courier.email)
      const nextCouriers = alreadyExists
        ? couriers.map((item) => (item.id === courier.id || item.email === courier.email ? courier : item))
        : [courier, ...couriers]

      setCouriers(nextCouriers)
      updateCouriers(data.store.id, nextCouriers)
      updateLogistics(data.store.id, { courierMode: 'Entregadores proprios' })
      setEmail('')
      toast.success('Entregador cadastrado com sucesso.')
    } catch {
      toast.error('Nao foi possivel cadastrar o entregador.')
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveCourier(courierId: string) {
    setRemovingId(courierId)

    try {
      await deleteStoreCourier(data.store.id, courierId)
      const nextCouriers = couriers.filter((courier) => courier.id !== courierId)
      setCouriers(nextCouriers)
      updateCouriers(data.store.id, nextCouriers)
      updateLogistics(data.store.id, {
        courierMode: nextCouriers.length > 0 ? 'Entregadores proprios' : 'Nao configurado',
      })
      toast.success('Entregador removido.')
    } catch {
      toast.error('Nao foi possivel remover o entregador.')
    } finally {
      setRemovingId(null)
    }
  }

  const activeCouriers = couriers.filter((courier) => courier.status === 'ativo').length

  return (
    <SectionFrame eyebrow="Logistica" title="Tipo de entrega">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="panel-card px-4 py-3 sm:px-5">
          <div className="hide-scrollbar flex gap-2 overflow-x-auto">
            {(['proprios', 'entregoh'] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  'inline-flex shrink-0 items-center rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                  activeTab === tab
                    ? 'border-coral-200 bg-coral-50 text-coral-700 shadow-soft'
                    : 'border-transparent bg-transparent text-ink-500 hover:border-ink-100 hover:bg-ink-50 hover:text-ink-900',
                ].join(' ')}
              >
                {tab === 'proprios' ? 'Proprios' : 'EntregoH!'}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'proprios' && (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard label="Preparo medio" value={data.logistics.averagePrepTime} helper="Acompanha a rapidez da cozinha." />
              <MetricCard label="Pontualidade" value={data.logistics.onTimeRate} helper="Pedidos dentro da janela prometida." />
              <MetricCard
                label="Modo de entrega"
                value={couriers.length > 0 ? 'Entregadores proprios' : data.logistics.courierMode}
                helper="Estrutura atual de distribuicao."
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_280px]">
            <div className="panel-card p-5">
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold text-ink-900">Cadastrar entregador por e-mail</p>
                  <p className="mt-1 text-sm text-ink-500">
                    Adicione os entregadores que vao operar na sua frota propria. O cadastro inicial e feito pelo e-mail.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="block flex-1">
                    <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                      E-mail do entregador
                    </span>
                    <div className="flex h-12 items-center rounded-2xl border border-ink-100 bg-white px-4">
                      <Mail className="h-4 w-4 shrink-0 text-ink-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="entregador@seudominio.com"
                        className="h-full w-full bg-transparent px-3 text-sm font-medium text-ink-900 outline-none"
                      />
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={() => void handleAddCourier()}
                    disabled={saving}
                    className="inline-flex h-12 items-center justify-center gap-2 self-end rounded-2xl bg-coral-500 px-5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Adicionar
                  </button>
                </div>

                <div className="space-y-3">
                  {couriers.length > 0 ? (
                    couriers.map((courier) => (
                      <div
                        key={courier.id}
                        className="flex flex-col gap-3 rounded-2xl border border-ink-100 bg-white p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint-100 text-mint-700">
                          <Bike className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-ink-900">{courier.email}</p>
                          <p className="mt-1 text-xs text-ink-400">Nome sugerido: {courier.name}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                            {courier.status === 'ativo' ? 'Ativo' : 'Pendente'}
                          </span>
                          <button
                            type="button"
                            onClick={() => void handleRemoveCourier(courier.id)}
                            disabled={removingId === courier.id}
                            className="rounded-xl p-2 text-ink-400 transition hover:bg-coral-50 hover:text-coral-500 disabled:opacity-60"
                          >
                            {removingId === courier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-ink-200 bg-ink-50 px-5 py-8 text-center">
                      <p className="text-sm font-semibold text-ink-900">Nenhum entregador cadastrado</p>
                      <p className="mt-2 text-sm text-ink-500">
                        Cadastre pelo menos um e-mail para ativar a operacao com entregadores proprios.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="panel-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Equipe</p>
                <p className="mt-3 font-display text-4xl font-bold text-ink-900">
                  {couriers.length}
                  <span className="ml-1 text-lg font-medium text-ink-400">entregadores</span>
                </p>
                <p className="mt-1 text-sm text-ink-500">cadastros vinculados a esta loja</p>
              </div>

              <div className="panel-card p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Status</p>
                <p className="mt-3 text-sm font-semibold text-ink-900">
                  {activeCouriers} ativos / {couriers.length} cadastrados
                </p>
                <p className="mt-2 text-xs leading-relaxed text-ink-500">
                  Os e-mails cadastrados servem como base para a operacao da frota propria. Depois voce pode ajustar os detalhes do fluxo.
                </p>
              </div>
            </div>
          </div>
          </div>
        )}

        {activeTab === 'entregoh' && (
          <EntregoHTab storeCity={data.store.addressCity} storeState={data.store.addressState} />
        )}
      </div>
    </SectionFrame>
  )
}
