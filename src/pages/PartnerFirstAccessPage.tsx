import { Box, CheckCircle2, ChevronRight, Clock3, Map, Store, LogOut } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { saveStore } from '@/services/partner'

type FirstAccessStep = {
  id: string
  title: string
  description: string
  route: string
  actionLabel: string
  complete: boolean
  icon: typeof Store
}

function StepCard({
  title,
  description,
  actionLabel,
  complete,
  icon: Icon,
  onClick,
}: Omit<FirstAccessStep, 'id' | 'route'> & { onClick: () => void }) {
  return (
    <article className="rounded-[28px] border border-[#ece7df] bg-white p-5 shadow-[0_18px_50px_rgba(21,18,14,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${complete ? 'bg-[#ecfdf3] text-[#1f9d55]' : 'bg-[#fff4eb] text-[#c26b2f]'}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold text-[#1f1b16]">{title}</p>
            <p className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${complete ? 'bg-[#ecfdf3] text-[#1f9d55]' : 'bg-[#fff4eb] text-[#c26b2f]'}`}>
              {complete ? 'Concluido' : 'Pendente'}
            </p>
          </div>
        </div>

        {complete ? <CheckCircle2 className="h-5 w-5 text-[#1f9d55]" /> : null}
      </div>

      <p className="mt-4 text-sm leading-6 text-[#6f665d]">{description}</p>

      <button
        type="button"
        onClick={onClick}
        className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#eadfd3] bg-[#fcfaf7] px-4 text-sm font-semibold text-[#2c251f] transition hover:border-[#ea1d2c] hover:bg-[#fff3f4] hover:text-[#ea1d2c]"
      >
        {actionLabel}
        <ChevronRight className="h-4 w-4" />
      </button>
    </article>
  )
}

export function PartnerFirstAccessPage() {
  const navigate = useNavigate()
  const { selectedStoreId, signOut } = usePartnerAuth()
  const { data, loading, error } = usePartnerDashboard(selectedStoreId)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <LoadingScreen />
  }

  if (!selectedStoreId) {
    return <Navigate to="/lojas" replace />
  }

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f6f1e8] px-4">
        <div className="w-full max-w-lg rounded-[32px] border border-[#eadfd3] bg-white p-8 text-center shadow-[0_20px_60px_rgba(31,27,22,0.08)]">
          <p className="text-xl font-bold text-[#1f1b16]">Nao foi possivel carregar o primeiro acesso.</p>
          <p className="mt-3 text-sm leading-6 text-[#6f665d]">
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
  const steps: FirstAccessStep[] = [
    {
      id: 'loja',
      title: 'Loja',
      description: 'Revise nome, categoria, descricao e dados principais que vao aparecer no seu painel.',
      route: '/app/loja',
      actionLabel: 'Configurar loja',
      complete: Boolean(
        dashboardData.store.name.trim() &&
        dashboardData.store.categoryId &&
        dashboardData.store.description.trim()
      ),
      icon: Store,
    },
    {
      id: 'horarios',
      title: 'Horarios',
      description: 'Defina pelo menos um periodo de funcionamento para que os clientes saibam quando voce atende.',
      route: '/app/horarios',
      actionLabel: 'Configurar horarios',
      complete: dashboardData.hours.some(
        (hour) => !hour.isClosed && Boolean(hour.opensAt) && Boolean(hour.closesAt)
      ),
      icon: Clock3,
    },
    {
      id: 'areas',
      title: 'Range de entrega',
      description: 'Cadastre suas areas de entrega e deixe ao menos uma ativa para comecar a operar.',
      route: '/app/areas',
      actionLabel: 'Configurar entrega',
      complete: dashboardData.deliveryAreas.some((area) => area.active),
      icon: Map,
    },
    {
      id: 'produto',
      title: 'Primeiro produto',
      description: 'Crie seu primeiro item no cardapio para concluir a entrada inicial da loja.',
      route: '/app/cardapio',
      actionLabel: 'Cadastrar produto',
      complete: dashboardData.products.some((product) => product.active),
      icon: Box,
    },
  ]

  const completedSteps = steps.filter((step) => step.complete).length
  const allStepsCompleted = completedSteps === steps.length

  async function handleFinishFirstAccess() {
    if (!allStepsCompleted || submitting) return

    setSubmitting(true)
    try {
      await saveStore(dashboardData.store.id, { firstAccess: true })
      toast.success('Primeiro acesso concluido com sucesso.')
      navigate('/app', { replace: true })
    } catch {
      toast.error('Nao foi possivel concluir o primeiro acesso. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[radial-gradient(circle_at_top,_#fff8f0_0%,_#f6f1e8_55%,_#efe6db_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center justify-between gap-3">
          <div className="rounded-full bg-white/80 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.18em] text-[#b45b21] shadow-[0_12px_30px_rgba(31,27,22,0.06)]">
            Primeiro acesso
          </div>
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-2xl border border-[#eadfd3] bg-white/80 px-4 py-2.5 text-sm font-semibold text-[#5d544c] transition hover:border-[#ea1d2c] hover:text-[#ea1d2c]"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>

        <section className="mt-6 overflow-hidden rounded-[36px] border border-[#eadfd3] bg-white/85 p-6 shadow-[0_25px_70px_rgba(31,27,22,0.08)] backdrop-blur sm:p-8 lg:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#c26b2f]">Bem-vindo ao painel</p>
              <h1 className="mt-4 max-w-[14ch] text-4xl font-black tracking-[-0.05em] text-[#1f1b16] sm:text-5xl">
                Vamos preparar sua loja para o primeiro acesso.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[#6f665d]">
                Esta area foi separada do painel para voce configurar o essencial com calma antes de entrar na operacao.
                Conclua as quatro etapas abaixo e finalize a entrada inicial da loja.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <div className="rounded-3xl bg-[#fcf6ef] px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b45b21]">Loja selecionada</p>
                  <p className="mt-2 text-lg font-bold text-[#1f1b16]">{dashboardData.store.name}</p>
                </div>
                <div className="rounded-3xl bg-[#f6f8fb] px-5 py-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#5e728f]">Progresso</p>
                  <p className="mt-2 text-lg font-bold text-[#1f1b16]">{completedSteps} de {steps.length} etapas</p>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] bg-[#1f1b16] p-6 text-white shadow-[0_20px_60px_rgba(31,27,22,0.18)]">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-white/55">Liberacao do painel</p>
              <p className="mt-4 text-2xl font-bold tracking-[-0.04em]">
                {allStepsCompleted ? 'Tudo pronto para entrar no painel.' : 'Ainda faltam etapas para concluir.'}
              </p>
              <p className="mt-4 text-sm leading-7 text-white/72">
                Quando todos os itens estiverem completos, voce podera marcar a entrada inicial como concluida e seguir
                para o painel principal da loja.
              </p>

              <div className="mt-8 space-y-3">
                {steps.map((step) => (
                  <div
                    key={step.id}
                    className={`flex items-center justify-between rounded-2xl px-4 py-3 ${step.complete ? 'bg-white/10' : 'bg-white/5'}`}
                  >
                    <span className="text-sm font-semibold text-white">{step.title}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${step.complete ? 'bg-[#1f9d55] text-white' : 'bg-white/12 text-white/70'}`}>
                      {step.complete ? 'Ok' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => void handleFinishFirstAccess()}
                disabled={!allStepsCompleted || submitting}
                className={[
                  'mt-8 inline-flex h-12 w-full items-center justify-center rounded-2xl text-sm font-bold transition',
                  allStepsCompleted && !submitting
                    ? 'bg-[#ea1d2c] text-white hover:brightness-95'
                    : 'cursor-not-allowed bg-white/12 text-white/45',
                ].join(' ')}
              >
                {submitting ? 'Finalizando...' : 'Concluir primeiro acesso'}
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <StepCard
              key={step.id}
              title={step.title}
              description={step.description}
              actionLabel={step.actionLabel}
              complete={step.complete}
              icon={step.icon}
              onClick={() => navigate(step.route)}
            />
          ))}
        </section>
      </div>
    </div>
  )
}
