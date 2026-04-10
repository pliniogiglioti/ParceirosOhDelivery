import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const weekDays = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado']

export function statusLabel(status: string) {
  if (status === 'aguardando') return 'Aguardando'
  if (status === 'confirmado') return 'Confirmado'
  if (status === 'preparo') return 'Em preparo'
  if (status === 'a_caminho') return 'A caminho'
  if (status === 'entregue') return 'Entregue'
  if (status === 'cancelado') return 'Cancelado'
  return status
}

export function statusTone(status: string) {
  if (status === 'aguardando') return 'bg-sand-100 text-sand-800'
  if (status === 'confirmado') return 'bg-ink-100 text-ink-800'
  if (status === 'preparo') return 'bg-coral-100 text-coral-700'
  if (status === 'a_caminho' || status === 'entregue') return 'bg-mint-100 text-mint-700'
  return 'bg-coral-100 text-coral-700'
}

export function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-white/70">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  )
}

export function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="metric-card">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-[-0.03em] text-ink-900">{value}</p>
      <p className="mt-2 text-sm text-ink-500">{helper}</p>
    </article>
  )
}

export function MiniInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-ink-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="mt-2 text-lg font-bold text-ink-900">{value}</p>
    </div>
  )
}

export function MiniInfoCardDark({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white/10 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">{label}</p>
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
    </div>
  )
}

export function SectionFrame({
  title,
  eyebrow,
  children,
}: {
  title: string
  eyebrow: string
  children: ReactNode
}) {
  return (
    <section className="animate-rise space-y-5">
      <div className="pl-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-coral-500">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-bold tracking-[-0.03em] text-ink-900">{title}</h2>
      </div>
      {children}
    </section>
  )
}

export function SidebarLabel({
  collapsed,
  className,
  children,
}: {
  collapsed: boolean
  className?: string
  children: ReactNode
}) {
  return (
    <span
      className={cn(
        'sidebar-label',
        collapsed ? 'sidebar-label-hidden' : 'sidebar-label-visible',
        className
      )}
    >
      {children}
    </span>
  )
}
