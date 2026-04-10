import { type ReactNode, useEffect, useState } from 'react'
import { ArrowRight, Box, CheckCircle2, Clock3, LogOut, Map, Store } from 'lucide-react'
import toast from 'react-hot-toast'
import { Navigate, useNavigate } from 'react-router-dom'
import { LoadingScreen } from '@/components/partner/LoadingScreen'
import { usePartnerAuth } from '@/hooks/usePartnerAuth'
import { usePartnerDashboard } from '@/hooks/usePartnerDashboard'
import { saveStore } from '@/services/partner'

type FirstAccessStep = {
  id: string
  label: string
  title: string
  description: string
  details: ReactNode
  route: string
  actionLabel: string
  complete: boolean
  icon: typeof Store
}

function StepperBar({
  current,
  steps,
}: {
  current: number
  steps: Array<Pick<FirstAccessStep, 'label' | 'complete'>>
}) {
  return (
    <div className="border-b border-[#ececec] bg-white px-4">
      <div className="mx-auto flex max-w-3xl overflow-x-auto">
        {steps.map((step, index) => (
          <div
            key={step.label}
            className={`min-w-[140px] flex-1 border-b-2 py-3 text-center text-[13px] font-semibold transition-all ${
              index === current
                ? 'border-[#ea1d2c] text-[#ea1d2c]'
                : step.complete
                ? 'border-transparent text-[#16a34a]'
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

function InfoBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-[#ececec] bg-[#fafafa] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b8b8b]">{title}</p>
      <div className="mt-2 text-[14px] leading-6 text-[#303030]">{children}</div>
    </div>
  )
}

export function PartnerFirstAccessPage() {
  const navigate = useNavigate()
  const { selectedStoreId, signOut } = usePartnerAuth()
  const { data, loading, error } = usePartnerDashboard(selectedStoreId)
  const [activeStep, setActiveStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return <LoadingScreen />
  }

  if (!selectedStoreId) {
    return <Navigate to="/lojas" replace />
  }

  if (!data) {
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
  const steps: FirstAccessStep[] = [
    {
      id: 'loja',
      label: 'Loja',
      title: 'Configure os dados principais da loja',
      description: 'Revise as informacoes basicas que vao aparecer para clientes e no painel do parceiro.',
      details: (
        <>
          <InfoBlock title="O que precisa estar pronto">
            Nome da loja, categoria e uma descricao basica da operacao.
          </InfoBlock>
          <InfoBlock title="Como concluir">
            Abra a tela de loja, salve os dados e volte para continuar o primeiro acesso.
          </InfoBlock>
        </>
      ),
      route: '/app/loja',
      actionLabel: 'Abrir configuracao da loja',
      complete: Boolean(
        dashboardData.store.name.trim() &&
        dashboardData.store.categoryId &&
        dashboardData.store.description.trim()
      ),
      icon: Store,
    },
    {
      id: 'horarios',
      label: 'Horarios',
      title: 'Defina os horarios de funcionamento',
      description: 'Configure pelo menos um horario de atendimento para sua loja comecar a operar corretamente.',
      details: (
        <>
          <InfoBlock title="O que precisa estar pronto">
            Pelo menos um dia com horario de abertura e fechamento ativo.
          </InfoBlock>
          <InfoBlock title="Como concluir">
            Abra a tela de horarios, ajuste a agenda semanal e salve antes de voltar.
          </InfoBlock>
        </>
      ),
      route: '/app/horarios',
      actionLabel: 'Abrir horarios',
      complete: dashboardData.hours.some(
        (hour) => !hour.isClosed && Boolean(hour.opensAt) && Boolean(hour.closesAt)
      ),
      icon: Clock3,
    },
    {
      id: 'areas',
      label: 'Entrega',
      title: 'Configure o range de entrega',
      description: 'Defina a cobertura de entrega da loja para liberar a operacao de delivery.',
      details: (
        <>
          <InfoBlock title="O que precisa estar pronto">
            Pelo menos uma area de entrega ativa cadastrada para a loja.
          </InfoBlock>
          <InfoBlock title="Como concluir">
            Abra a tela de areas e confirme ao menos uma zona ativa para entrega.
          </InfoBlock>
        </>
      ),
      route: '/app/areas',
      actionLabel: 'Abrir areas de entrega',
      complete: dashboardData.deliveryAreas.some((area) => area.active),
      icon: Map,
    },
    {
      id: 'produto',
      label: 'Primeiro produto',
      title: 'Cadastre o primeiro produto',
      description: 'Adicione o primeiro item ao cardapio para concluir a entrada inicial da loja.',
      details: (
        <>
          <InfoBlock title="O que precisa estar pronto">
            Pelo menos um produto ativo no cardapio da loja.
          </InfoBlock>
          <InfoBlock title="Como concluir">
            Abra o cardapio, cadastre o primeiro item e volte para finalizar o processo.
          </InfoBlock>
        </>
      ),
      route: '/app/cardapio',
      actionLabel: 'Abrir cardapio',
      complete: dashboardData.products.some((product) => product.active),
      icon: Box,
    },
  ]

  const firstIncompleteIndex = steps.findIndex((step) => !step.complete)
  const suggestedStep = firstIncompleteIndex === -1 ? steps.length - 1 : firstIncompleteIndex

  useEffect(() => {
    setActiveStep((current) => {
      if (current > suggestedStep) return suggestedStep
      if (steps[current]?.complete && suggestedStep > current) return suggestedStep
      return current
    })
  }, [suggestedStep, steps])

  const currentStep = steps[activeStep] ?? steps[0]
  const completedSteps = steps.filter((step) => step.complete).length
  const allStepsCompleted = completedSteps === steps.length
  const Icon = currentStep.icon

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

  function handleNextStep() {
    setActiveStep((current) => Math.min(current + 1, steps.length - 1))
  }

  return (
    <div className="min-h-dvh bg-[#f5f5f5]">
      <StepperBar current={activeStep} steps={steps} />

      <main className="mx-auto flex max-w-3xl flex-col px-4 py-8 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#ea1d2c]">Primeiro acesso</p>
            <p className="mt-1 text-[14px] text-[#686868]">
              Loja: <span className="font-semibold text-[#1d1d1d]">{dashboardData.store.name}</span>
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

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-[#8b8b8b]">
                Etapa {activeStep + 1} de {steps.length}
              </p>
              <h1 className="mt-3 text-[26px] font-bold tracking-[-0.04em] text-[#1d1d1d]">
                {currentStep.title}
              </h1>
              <p className="mt-2 text-[14px] leading-6 text-[#686868]">{currentStep.description}</p>
            </div>

            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                currentStep.complete ? 'bg-[#ecfdf3] text-[#16a34a]' : 'bg-[#fff1f2] text-[#ea1d2c]'
              }`}
            >
              {currentStep.complete ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
            </div>
          </div>

          <div className="mt-6 grid gap-4">{currentStep.details}</div>

          <div className="mt-6 rounded-xl border border-[#ececec] bg-[#fafafa] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b8b8b]">Status da etapa</p>
            <p className={`mt-2 text-[14px] font-semibold ${currentStep.complete ? 'text-[#16a34a]' : 'text-[#b45309]'}`}>
              {currentStep.complete ? 'Etapa concluida.' : 'Etapa pendente.'}
            </p>
          </div>

          <div className="mt-6 rounded-xl border border-[#ececec] bg-[#fffaf4] px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b45309]">Progresso geral</p>
            <p className="mt-2 text-[14px] leading-6 text-[#7c5b2f]">
              Voce concluiu {completedSteps} de {steps.length} etapas do primeiro acesso.
            </p>
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

          <button
            type="button"
            onClick={() => navigate(currentStep.route)}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95"
          >
            {currentStep.actionLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex gap-3">
          {!allStepsCompleted ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={!currentStep.complete || activeStep === steps.length - 1}
              className="h-[52px] w-full rounded-2xl border border-[#d9d9d9] bg-white text-[14px] font-semibold text-[#303030] transition hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Proxima etapa
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleFinishFirstAccess()}
              disabled={submitting}
              className="flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ea1d2c] text-[15px] font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Finalizando...' : 'Concluir primeiro acesso'}
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
