import { AlertCircle, CheckCircle2, ChevronRight, Clock, Headphones, HelpCircle, MessageCircle, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

type TicketStatus = 'aberto' | 'em_andamento' | 'resolvido'
type TicketCategory = 'financeiro' | 'pedido' | 'cardapio' | 'tecnico' | 'outro'

interface Ticket {
  id: string
  protocol: string
  title: string
  category: TicketCategory
  status: TicketStatus
  createdAt: string
  updatedAt: string
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: 't1',
    protocol: '#SUP-00142',
    title: 'Repasse financeiro com valor incorreto',
    category: 'financeiro',
    status: 'em_andamento',
    createdAt: '08/04/2026',
    updatedAt: 'Hoje, 10:02',
  },
  {
    id: 't2',
    protocol: '#SUP-00138',
    title: 'Produto sumiu do cardápio após atualização',
    category: 'cardapio',
    status: 'resolvido',
    createdAt: '05/04/2026',
    updatedAt: '06/04/2026',
  },
]

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

function NewTicketModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (title: string, category: TicketCategory, description: string) => void
}) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<TicketCategory>('outro')
  const [description, setDescription] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    onSubmit(title, category, description)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="panel-card w-full max-w-lg p-6">
        <div className="flex items-center justify-between">
          <p className="font-display text-lg font-bold text-ink-900">Abrir chamado</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-2xl text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

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
              onClick={onClose}
              className="rounded-2xl border border-ink-100 px-5 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-ink-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !description.trim()}
              className="rounded-2xl bg-coral-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-coral-600 disabled:opacity-40"
            >
              Abrir chamado
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function PartnerSupportPage() {
  const [tickets, setTickets] = useState(INITIAL_TICKETS)
  const [modalOpen, setModalOpen] = useState(false)

  const open      = tickets.filter((t) => t.status === 'aberto').length
  const inProgress = tickets.filter((t) => t.status === 'em_andamento').length
  const resolved  = tickets.filter((t) => t.status === 'resolvido').length

  function handleNewTicket(title: string, category: TicketCategory, _description: string) {
    const id = `t${Date.now()}`
    const protocol = `#SUP-${String(Math.floor(Math.random() * 900) + 100).padStart(5, '0')}`
    setTickets((prev) => [
      {
        id,
        protocol,
        title,
        category,
        status: 'aberto',
        createdAt: new Date().toLocaleDateString('pt-BR'),
        updatedAt: 'Agora',
      },
      ...prev,
    ])
    setModalOpen(false)
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

          <div className="panel-card flex cursor-pointer flex-col items-center justify-center gap-2 p-5 transition hover:bg-ink-50"
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
            {tickets.length === 0 ? (
              <div className="panel-card flex flex-col items-center justify-center gap-3 py-16">
                <Headphones className="h-10 w-10 text-ink-200" />
                <p className="text-sm text-ink-400">Nenhum chamado aberto.</p>
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
                          <p className="text-sm font-semibold text-ink-900 truncate">{ticket.title}</p>
                          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold', CATEGORY_COLOR[ticket.category])}>
                            {CATEGORIES.find((c) => c.id === ticket.category)?.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3">
                          <span className="text-xs text-ink-400">{ticket.protocol}</span>
                          <span className="text-xs text-ink-300">·</span>
                          <span className="text-xs text-ink-400">Atualizado {ticket.updatedAt}</span>
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
                <span className="text-xs text-green-600 font-medium">Online agora</span>
              </div>
            </div>

            <div className="panel-card p-5">
              <div className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-ink-400" />
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Dúvidas comuns</p>
              </div>
              <ul className="mt-3 space-y-2">
                {[
                  'Como funciona o repasse?',
                  'Como pausar minha loja?',
                  'Como editar o cardápio?',
                  'Prazo para receber pedidos?',
                ].map((q) => (
                  <li key={q}>
                    <button type="button" className="flex w-full items-center justify-between gap-2 text-left text-xs text-ink-600 transition hover:text-coral-500">
                      {q}
                      <ChevronRight className="h-3 w-3 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>
      </SectionFrame>

      {modalOpen && (
        <NewTicketModal onClose={() => setModalOpen(false)} onSubmit={handleNewTicket} />
      )}
    </>
  )
}
