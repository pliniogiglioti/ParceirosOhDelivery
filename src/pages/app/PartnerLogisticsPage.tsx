import { Bike, Clock, Loader2, Mail, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { MetricCard, SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import { deleteStoreCourier, saveStoreCourier } from '@/services/partner'
import type { StoreCourier } from '@/types'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

type Tab = 'proprios' | 'entregoh'

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
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-coral-200 bg-white px-6 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-coral-50 text-coral-500">
              <Clock className="h-8 w-8" />
            </div>
            <p className="mt-4 text-xl font-bold text-ink-900">Em breve — EntregoH!</p>
            <p className="mt-2 max-w-sm text-sm text-ink-500">
              A integracao com a EntregoH! esta sendo desenvolvida. Em breve voce podera contratar entregadores sob demanda diretamente pela plataforma.
            </p>
          </div>
        )}
      </div>
    </SectionFrame>
  )
}
