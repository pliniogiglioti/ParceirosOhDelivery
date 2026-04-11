import type { ElementType } from 'react'
import { ChevronDown, CreditCard, QrCode, Utensils, Wallet, WalletCards } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { PaymentBrandItem, PaymentMethodItem } from '@/types'

type MethodMeta = {
  icon: ElementType
  color: string
  iconBg: string
}

const paymentMetaById: Record<string, MethodMeta> = {
  credito: {
    icon: CreditCard,
    color: 'text-blue-600',
    iconBg: 'bg-blue-50',
  },
  debito: {
    icon: Wallet,
    color: 'text-indigo-600',
    iconBg: 'bg-indigo-50',
  },
  pix: {
    icon: QrCode,
    color: 'text-[#14c8bb]',
    iconBg: 'bg-[#14c8bb]/10',
  },
  dinheiro: {
    icon: WalletCards,
    color: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
  },
  vale: {
    icon: Utensils,
    color: 'text-orange-500',
    iconBg: 'bg-orange-50',
  },
}

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
  brand: PaymentBrandItem
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
        brand.active && !disabled
          ? 'border-transparent bg-ink-900 text-white'
          : 'border-ink-100 bg-ink-50 text-ink-400',
        disabled && 'cursor-not-allowed opacity-40'
      )}
    >
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
  payment: PaymentMethodItem
  onToggle: () => void
  onToggleBrand: (paymentId: string, brandId: string) => void
}) {
  const [expanded, setExpanded] = useState(Boolean(payment.brands?.length))
  const meta = paymentMetaById[payment.id] ?? paymentMetaById.pix
  const Icon = meta.icon
  const hasBrands = Boolean(payment.brands?.length)
  const activeBrandsCount = payment.brands?.filter((brand) => brand.active).length ?? 0

  return (
    <div className={cn('transition', !payment.active && 'opacity-55')}>
      <div className="flex items-center gap-4 px-5 py-4">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', meta.iconBg, meta.color)}>
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink-900">{payment.label}</p>
          {hasBrands ? (
            <p className="mt-0.5 text-xs text-ink-400">
              {activeBrandsCount} {activeBrandsCount === 1 ? 'bandeira ativa' : 'bandeiras ativas'}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-ink-400">{payment.detail}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {hasBrands ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="flex items-center gap-1 text-xs font-medium text-ink-400 transition hover:text-ink-700"
            >
              Bandeiras
              <ChevronDown
                className="h-3.5 w-3.5 transition-transform"
                style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
          ) : null}

          <span className={cn('text-xs font-semibold', payment.active ? 'text-coral-500' : 'text-ink-400')}>
            {payment.active ? 'Ativo' : 'Inativo'}
          </span>
          <Switch enabled={payment.active} onChange={onToggle} />
        </div>
      </div>

      {hasBrands && expanded ? (
        <div className="border-t border-ink-100 bg-ink-50/60 px-5 py-4">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Bandeiras aceitas
          </p>
          <div className="flex flex-wrap gap-2">
            {payment.brands!.map((brand) => {
              const isLastActive = brand.active && activeBrandsCount <= 1 && payment.active
              return (
                <BrandChip
                  key={brand.id}
                  brand={brand}
                  disabled={!payment.active || isLastActive}
                  onToggle={() => onToggleBrand(payment.id, brand.id)}
                />
              )
            })}
          </div>
          {!payment.active ? (
            <p className="mt-3 text-[11px] text-ink-400">Ative esta forma de pagamento para editar as bandeiras.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function togglePaymentMethod(
  methods: PaymentMethodItem[],
  id: string
): PaymentMethodItem[] {
  return methods.map((method) => {
    if (method.id !== id) return method

    const enabling = !method.active

    if (enabling && method.brands?.length) {
      const anyActive = method.brands.some((brand) => brand.active)
      if (!anyActive) {
        return {
          ...method,
          active: true,
          brands: method.brands.map((brand, index) => (index === 0 ? { ...brand, active: true } : brand)),
        }
      }
    }

    return { ...method, active: enabling }
  })
}

export function togglePaymentBrand(
  methods: PaymentMethodItem[],
  paymentId: string,
  brandId: string
): PaymentMethodItem[] {
  return methods.map((method) => {
    if (method.id !== paymentId) return method

    const targetBrand = method.brands?.find((brand) => brand.id === brandId)
    const activeCount = method.brands?.filter((brand) => brand.active).length ?? 0

    if (targetBrand?.active && activeCount <= 1) {
      return method
    }

    return {
      ...method,
      brands: method.brands?.map((brand) =>
        brand.id === brandId ? { ...brand, active: !brand.active } : brand
      ),
    }
  })
}

export function PaymentMethodsEditor({
  methods,
  onChange,
  helperText,
}: {
  methods: PaymentMethodItem[]
  onChange: (methods: PaymentMethodItem[]) => void
  helperText?: string
}) {
  const activeCount = methods.filter((method) => method.active).length

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="panel-card divide-y divide-ink-100 overflow-hidden">
        {methods.map((method) => (
          <PaymentRow
            key={method.id}
            payment={method}
            onToggle={() => onChange(togglePaymentMethod(methods, method.id))}
            onToggleBrand={(paymentId, brandId) => onChange(togglePaymentBrand(methods, paymentId, brandId))}
          />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        <div className="panel-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Resumo</p>
          <p className="mt-3 font-display text-4xl font-bold text-ink-900">
            {activeCount}
            <span className="ml-1 text-lg font-medium text-ink-400">/ {methods.length}</span>
          </p>
          <p className="mt-1 text-sm text-ink-500">formas ativas no momento</p>

          <div className="mt-4 space-y-2.5">
            {methods.map((method) => {
              const meta = paymentMetaById[method.id] ?? paymentMetaById.pix
              const Icon = meta.icon
              const activeBrands = method.brands?.filter((brand) => brand.active) ?? []

              return (
                <div key={method.id}>
                  <div className="flex items-center gap-2">
                    <Icon className={cn('h-3.5 w-3.5', method.active ? meta.color : 'text-ink-300')} />
                    <span className={cn('text-xs font-medium', method.active ? 'text-ink-700' : 'text-ink-300 line-through')}>
                      {method.label}
                    </span>
                  </div>

                  {method.active && activeBrands.length > 0 ? (
                    <p className="ml-5 mt-0.5 text-[10px] text-ink-400">
                      {activeBrands.map((brand) => brand.label).join(', ')}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="panel-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">Dica</p>
          <p className="mt-2 text-xs leading-relaxed text-ink-500">
            {helperText ?? 'Oferecer mais formas de pagamento ajuda a aumentar a conversao dos pedidos.'}
          </p>
        </div>
      </div>
    </div>
  )
}
