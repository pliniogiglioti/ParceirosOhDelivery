import { AlertCircle, BookOpen, CheckCircle2, ChevronRight, Clock, ExternalLink, Headphones, HelpCircle, MessageCircle, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'
import { usePartnerPageData } from '@/hooks/usePartnerPageData'
import {
  createSupportTicket,
  fetchSupportTickets,
} from '@/services/support'
import type { SupportTicket, TicketCategory, TicketStatus } from '@/services/support'

const CATEGORIES: { id: TicketCategory; label: string }[] = [
  { id: 'financeiro', label: 'Financeiro / Repasse' },
  { id: 'pedido',     label: 'Problema com pedido' },
  { id: 'cardapio',   label: 'Cardápio / Produtos' },
  { id: 'tecnico',    label: 'Problema técnico' },
  { id: 'outro',      label: 'Outro assunto' },
]

const STATUS_CONFIG: Record<TicketStatus, { label: string; icon: React.ElementType; bg: string; text: string }> = {
  aberto:        { label: 'Aberto',        icon: AlertCircle,   bg: 'bg-coral-50',  text: 'text-coral-600'  },
  em_andamento:  { label: 'Em andamento',  icon: Clock,         bg: 'bg-yellow-50', text: 'text-yellow-600' },
  resolvido:     { label: 'Resolvido',     icon: CheckCircle2,  bg: 'bg-green-50',  text: 'text-green-600'  },
}

const CATEGORY_COLOR: Record<TicketCategory, string> = {
  financeiro: 'bg-blue-50 text-blue-600',
  pedido:     'bg-coral-50 text-coral-600',
  cardapio:   'bg-orange-50 text-orange-600',
  tecnico:    'bg-purple-50 text-purple-600',
  outro:      'bg-ink-100 text-ink-600',
}

function formatTicketDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) return 'Agora'
  if (diffMinutes < 60) return `Há ${diffMinutes} min`

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `Há ${diffHours}h`

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`

  return date.toLocaleDateString('pt-BR')
}

function NewTicketModal({
  onClose,
  onSubmit,
  submitting,
}: {
  onClose: () => void
  onSubmit: (title: string, category: TicketCategory, description: string) => Promise<void>
  submitting: boolean
}) {
  const [step, setStep] = useState<'confirm' | 'form'>('confirm')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TicketCategory>('outro')
  const [description, setDescription] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    await onSubmit(title, category, description)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="panel-card w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold text-ink-900">Abrir chamado</p>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-2xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 'confirm' ? (
          <div className="mt-5">
            <div className="flex items-start gap-4 rounded-2xl border border-ink-100 bg-ink-50 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-coral-50 text-coral-500">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-900">Você já consultou a Central de Ajuda?</p>
                <p className="mt-1 text-xs leading-5 text-ink-500">
                  Muitas dúvidas já têm resposta nos nossos artigos. Antes de abrir um chamado, confira se sua dúvida já foi respondida.
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <a
                href="/ajuda"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 rounded-2xl border border-ink-100 px-5 py-3 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
              >
                <ExternalLink className="h-4 w-4" />
                Consultar Central de Ajuda
              </a>
              <button
                type="button"
                onClick={() => setStep('form')}
                className="rounded-2xl bg-coral-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-coral-600"
              >
                Já consultei, quero abrir um chamado
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">Categoria</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={cn(
                      'rounded-2xl border px-3 py-1.5 text-xs font-semibold transition',
                      category === c.id
                        ? 'border-transparent bg-ink-900 text-white'
                        : 'border-ink-100 text-ink-600 hover:bg-ink-50'
                    )}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">Assunto</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Descreva o problema em poucas palavras..."
                className="w-full rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-coral-300 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-ink-700">Detalhes</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Explique com detalhes o que aconteceu..."
                className="w-full resize-none rounded-2xl border border-ink-100 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 outline-none placeholder:text-ink-400 focus:border-coral-300 focus:bg-white transition"
              />
            </div>

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setStep('confirm')}
                disabled={submitting}
                className="rounded-2xl border border-ink-100 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"
              >
                Voltar
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !description.trim() || submitting}
                className="rounded-2xl bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-40"
              >
                {submitting ? 'Enviando...' : 'Abrir chamado'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function PartnerSupportPage() {
  const { data } = usePartnerPageData()
  const storeId = data.store.id

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!storeId) return
    let active = true

    void (async () => {
      setLoading(true)
      try {
        const result = await fetchSupportTickets(storeId)
        if (active) setTickets(result)
      } catch {
        if (active) toast.error('Nao foi possivel carregar os chamados.')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => { active = false }
  }, [storeId])

  const open       = tickets.filter((t) => t.status === 'aberto').length
  const inProgress = tickets.filter((t) => t.status === 'em_andamento').length
  const resolved   = tickets.filter((t) => t.status === 'resolvido').length

  async function handleNewTicket(title: string, category: TicketCategory, description: string) {
    setSubmitting(true)
    try {
      const ticket = await createSupportTicket(storeId, { title, category, description })
      setTickets((prev) => [ticket, ...prev])
      setModalOpen(false)
      toast.success('Chamado aberto com sucesso!')
    } catch {
      toast.error('Nao foi possivel abrir o chamado. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <SectionFrame eyebrow="Suporte" title="Central de ajuda">

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="panel-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Abertos</p>
              <AlertCircle className="h-4 w-4 text-coral-500" />
            </div>
            <p className="mt-3 font-display text-4xl font-bold text-ink-900">{open}</p>
            <p className="mt-1 text-xs text-ink-400">aguardando resposta</p>
          </div>

          <div className="panel-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Em andamento</p>
              <Clock className="h-4 w-4 text-yellow-500" />
            </div>
            <p className="mt-3 font-display text-4xl font-bold text-ink-900">{inProgress}</p>
            <p className="mt-1 text-xs text-ink-400">sendo atendidos</p>
          </div>

          <div className="panel-card p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Resolvidos</p>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </div>
            <p className="mt-3 font-display text-4xl font-bold text-ink-900">{resolved}</p>
            <p className="mt-1 text-xs text-ink-400">neste mês</p>
          </div>

          <div
            className="panel-card flex cursor-pointer flex-col items-center justify-center gap-2 p-5 transition hover:bg-ink-50"
            onClick={() => setModalOpen(true)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-coral-500 text-white">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-ink-900">Abrir chamado</p>
            <p className="text-xs text-ink-400">Novo atendimento</p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">

          {/* Tickets list */}
          <div className="flex flex-col gap-3">
            <p className="pl-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Seus chamados</p>

            {loading ? (
              <div className="panel-card flex flex-col items-center justify-center gap-3 py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-ink-200 border-t-coral-500" />
                <p className="text-sm text-ink-400">Carregando chamados...</p>
              </div>
            ) : tickets.length === 0 ? (
              <div className="panel-card flex flex-col items-center justify-center gap-3 py-16">
                <Headphones className="h-10 w-10 text-ink-200" />
                <p className="text-sm text-ink-400">Nenhum chamado aberto.</p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-1 rounded-2xl bg-coral-500 px-4 py-2 text-xs font-semibold text-white transition hover:bg-coral-600"
                >
                  Abrir primeiro chamado
                </button>
              </div>
            ) : (
              <div className="panel-card divide-y divide-ink-100 overflow-hidden">
                {tickets.map((ticket) => {
                  const st = STATUS_CONFIG[ticket.status]
                  const Icon = st.icon
                  return (
                    <div key={ticket.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-ink-50">
                      <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl', st.bg, st.text)}>
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-ink-900">{ticket.title}</p>
                          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', CATEGORY_COLOR[ticket.category])}>
                            {CATEGORIES.find((c) => c.id === ticket.category)?.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3">
                          <span className="text-xs text-ink-400">#{ticket.protocol}</span>
                          <span className="text-xs text-ink-300">·</span>
                          <span className="text-xs text-ink-400">Atualizado {formatTicketDate(ticket.updatedAt)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', st.bg, st.text)}>
                          {st.label}
                        </span>
                        <ChevronRight className="h-4 w-4 text-ink-300" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            <div className="panel-card p-5">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-[#14c8bb]" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Atendimento</p>
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-900">Seg – Sex, 8h às 20h</p>
              <p className="mt-0.5 text-xs text-ink-400">Sáb, 9h às 14h</p>
              <div className="mt-3 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400" />
                <span className="text-xs font-medium text-green-600">Online agora</span>
              </div>
            </div>

            <div className="panel-card p-5">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-ink-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Dúvidas comuns</p>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  { label: 'Como funciona o repasse?',        slug: 'como-funciona-o-repasse'      },
                  { label: 'Como pausar minha loja?',         slug: 'como-pausar-minha-loja'       },
                  { label: 'Como editar o cardápio?',         slug: 'como-editar-o-cardapio'       },
                  { label: 'Prazo para receber pedidos?',     slug: 'prazo-para-receber-pedidos'   },
                ].map(({ label, slug }) => (
                  <li key={slug}>
                    <a
                      href={`/ajuda/${slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex w-full items-center justify-between gap-2 text-left text-xs text-ink-600 transition hover:text-coral-500"
                    >
                      {label}
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </SectionFrame>

      {modalOpen && (
        <NewTicketModal
          onClose={() => setModalOpen(false)}
          onSubmit={handleNewTicket}
          submitting={submitting}
        />
      )}
    </>
  )
}
