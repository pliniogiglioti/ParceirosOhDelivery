import { ChevronDown, CreditCard, QrCode, Utensils, Wallet } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SectionFrame } from '@/components/partner/PartnerUi'

interface Brand {
  id: string
  label: string
  logo: string // SVG inline or color initials
  color: string
  enabled: boolean
}

interface PaymentOption {
  id: string
  label: string
  description: string
  icon: React.ElementType
  color: string
  iconBg: string
  enabled: boolean
  brands?: Brand[]
}

const CREDIT_BRANDS: Brand[] = [
  { id: 'visa',       label: 'Visa',        logo: 'VISA',   color: '#1a1f71', enabled: true  },
  { id: 'master',     label: 'Mastercard',  logo: 'MC',     color: '#eb001b', enabled: true  },
  { id: 'elo',        label: 'Elo',         logo: 'ELO',    color: '#00a4e0', enabled: true  },
  { id: 'amex',       label: 'Amex',        logo: 'AMEX',   color: '#007bc1', enabled: false },
  { id: 'hipercard',  label: 'Hipercard',   logo: 'HIPER',  color: '#b3131b', enabled: false },
]

const DEBIT_BRANDS: Brand[] = [
  { id: 'visa-e',     label: 'Visa Electron', logo: 'VISA',  color: '#1a1f71', enabled: true  },
  { id: 'maestro',    label: 'Maestro',       logo: 'MAE',   color: '#eb001b', enabled: true  },
  { id: 'elo-d',      label: 'Elo Débito',    logo: 'ELO',   color: '#00a4e0', enabled: true  },
  { id: 'cabal',      label: 'Cabal',         logo: 'CAB',   color: '#004a97', enabled: false },
]

const VALE_BRANDS: Brand[] = [
  { id: 'ticket',     label: 'Ticket',        logo: 'TKT',   color: '#e8292b', enabled: false },
  { id: 'sodexo',     label: 'Sodexo',        logo: 'SDX',   color: '#e3051b', enabled: false },
  { id: 'alelo',      label: 'Alelo',         logo: 'ALE',   color: '#00843d', enabled: false },
  { id: 'vr',         label: 'VR',            logo: 'VR',    color: '#e8292b', enabled: false },
  { id: 'ben',        label: 'Ben Visa Vale',  logo: 'BEN',   color: '#702f8a', enabled: false },
]

const INITIAL_PAYMENTS: PaymentOption[] = [
  {
    id: 'credito',
    label: 'Cartão de Crédito',
    description: 'Selecione as bandeiras aceitas.',
    icon: CreditCard,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50',
    enabled: true,
    brands: CREDIT_BRANDS,
  },
  {
    id: 'debito',
    label: 'Cartão de Débito',
    description: 'Selecione as bandeiras aceitas.',
    icon: Wallet,
    color: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
    enabled: true,
    brands: DEBIT_BRANDS,
  },
  {
    id: 'pix',
    label: 'Pix',
    description: 'Pagamento instantâneo via chave Pix.',
    icon: QrCode,
    color: 'text-[#14c8bb]',
    iconBg: 'bg-[#14c8bb]/10',
    enabled: true,
  },
  {
    id: 'vale',
    label: 'Vale-Alimentação',
    description: 'Selecione as bandeiras aceitas.',
    icon: Utensils,
    color: 'text-orange-500',
    iconBg: 'bg-orange-50',
    enabled: false,
    brands: VALE_BRANDS,
  },
]

function Switch({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
        enabled ? 'bg-coral-500' : 'bg-ink-200'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-200',
          enabled ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  )
}

function BrandChip({
  brand,
  disabled,
  onToggle,
}: {
  brand: Brand
  disabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-semibold transition',
        brand.enabled && !disabled
          ? 'border-transparent bg-ink-900 text-white'
          : 'border-ink-100 bg-ink-50 text-ink-400',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
      {/* Mini logo badge */}
      <span
        className="flex h-5 w-7 items-center justify-center rounded text-[8px] font-black text-white"
        style={{ backgroundColor: brand.color, letterSpacing: '-0.03em' }}
      >
        {brand.logo}
      </span>
      {brand.label}
    </button>
  )
}

function PaymentRow({
  payment,
  onToggle,
  onToggleBrand,
}: {
  payment: PaymentOption
  onToggle: () => void
  onToggleBrand: (paymentId: string, brandId: string) => void
}) {
  const [expanded, setExpanded] = useState(!!payment.brands?.length)
  const Icon = payment.icon
  const hasBrands = !!payment.brands?.length
  const activeBrandsCount = payment.brands?.filter((b) => b.enabled).length ?? 0

  return (
    <div className={cn('transition', !payment.enabled && 'opacity-55')}>
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', payment.iconBg, payment.color)}>
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">{payment.label}</p>
          {hasBrands ? (
            <p className="mt-0.5 text-xs text-ink-400">
              {activeBrandsCount} {activeBrandsCount === 1 ? 'bandeira ativa' : 'bandeiras ativas'}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-400">{payment.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasBrands && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs font-medium text-ink-400 transition hover:text-ink-700"
            >
              Bandeiras
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          )}
          <span className={cn('text-xs font-semibold', payment.enabled ? 'text-coral-500' : 'text-ink-400')}>
            {payment.enabled ? 'Ativo' : 'Inativo'}
          </span>
          <Switch enabled={payment.enabled} onChange={onToggle} />
        </div>
      </div>

      {/* Brands panel — always accessible */}
      {hasBrands && expanded && (
        <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Bandeiras aceitas
          </p>
          <div className="flex flex-wrap gap-2">
            {payment.brands!.map((brand) => {
              const isLastActive = brand.enabled && activeBrandsCount <= 1 && payment.enabled
              return (
                <BrandChip
                  key={brand.id}
                  brand={brand}
                  disabled={!payment.enabled || isLastActive}
                  onToggle={() => onToggleBrand(payment.id, brand.id)}
                />
              )
            })}
          </div>
          {!payment.enabled && (
            <p className="mt-3 text-[11px] text-ink-400">Ative esta forma de pagamento para editar as bandeiras.</p>
          )}
        </div>
      )}
    </div>
  )
}

export function PartnerPaymentsPage() {
  const [payments, setPayments] = useState(INITIAL_PAYMENTS)

  function togglePayment(id: string) {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p
        const enabling = !p.enabled
        // when enabling a method that has brands but none active, auto-enable first brand
        if (enabling && p.brands) {
          const anyActive = p.brands.some((b) => b.enabled)
          if (!anyActive) {
            return {
              ...p,
              enabled: true,
              brands: p.brands.map((b, i) => (i === 0 ? { ...b, enabled: true } : b)),
            }
          }
        }
        return { ...p, enabled: enabling }
      })
    )
  }

  function toggleBrand(paymentId: string, brandId: string) {
    setPayments((prev) =>
      prev.map((p) => {
        if (p.id !== paymentId) return p
        const target = p.brands?.find((b) => b.id === brandId)
        const activeCount = p.brands?.filter((b) => b.enabled).length ?? 0
        // block disabling the last active brand
        if (target?.enabled && activeCount <= 1) return p
        return {
          ...p,
          brands: p.brands?.map((b) =>
            b.id === brandId ? { ...b, enabled: !b.enabled } : b
          ),
        }
      })
    )
  }

  const activeCount = payments.filter((p) => p.enabled).length

  return (
    <SectionFrame eyebrow="Pagamentos" title="Formas de pagamento">
      <div className="grid gap-4 lg:grid-cols-[1fr_260px]">

        {/* Payment list */}
        <div className="panel-card divide-y divide-ink-100 overflow-hidden">
          {payments.map((p) => (
            <PaymentRow
              key={p.id}
              payment={p}
              onToggle={() => togglePayment(p.id)}
              onToggleBrand={toggleBrand}
            />
          ))}
        </div>

        {/* Summary */}
        <div className="flex flex-col gap-4">
          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Resumo</p>
            <p className="mt-3 font-display text-4xl font-bold text-ink-900">
              {activeCount}
              <span className="ml-1 text-lg font-medium text-ink-400">/ {payments.length}</span>
            </p>
            <p className="mt-1 text-sm text-ink-500">formas ativas no momento</p>

            <div className="mt-4 space-y-2.5">
              {payments.map((p) => {
                const Icon = p.icon
                const activeBrands = p.brands?.filter((b) => b.enabled) ?? []
                return (
                  <div key={p.id}>
                    <div className="flex items-center gap-2">
                      <Icon className={cn('h-3.5 w-3.5', p.enabled ? p.color : 'text-ink-300')} />
                      <span className={cn('text-xs font-medium', p.enabled ? 'text-ink-700' : 'text-ink-300 line-through')}>
                        {p.label}
                      </span>
                    </div>
                    {p.enabled && activeBrands.length > 0 && (
                      <p className="ml-5 mt-0.5 text-[10px] text-ink-400">
                        {activeBrands.map((b) => b.label).join(', ')}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="panel-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Dica</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              Oferecer mais formas de pagamento aumenta a taxa de conversão de pedidos.
            </p>
          </div>
        </div>

      </div>
    </SectionFrame>
  )
}
