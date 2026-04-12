import type { PaymentBrandItem, PaymentMethodItem } from '@/types'

export type PaymentMethodTemplate = {
  id: string
  label: string
  detail: string
  brands?: PaymentBrandItem[]
}

export const PAYMENT_METHOD_TEMPLATES: PaymentMethodTemplate[] = [
  {
    id: 'credito',
    label: 'Cartao de credito e debito',
    detail: 'Selecione as bandeiras aceitas.',
    brands: [
      { id: 'visa',   label: 'Visa',             logo: 'VISA', color: '#1a1f71', active: false },
      { id: 'master', label: 'Mastercard',        logo: 'MC',   color: '#eb001b', active: false },
      { id: 'amex',   label: 'American Express',  logo: 'AMEX', color: '#007bc1', active: false },
      { id: 'elo',    label: 'Elo',               logo: 'ELO',  color: '#ffcb05', active: false },
    ],
  },
  {
    id: 'vale',
    label: 'Vale-Refeicao',
    detail: 'Selecione as bandeiras aceitas.',
    brands: [
      { id: 'alelo',  label: 'Alelo',   logo: 'ALE', color: '#00843d', active: false },
      { id: 'ben',    label: 'Ben',     logo: 'BEN', color: '#702f8a', active: false },
      { id: 'sodexo', label: 'Sodexo',  logo: 'SDX', color: '#e3051b', active: false },
      { id: 'ticket', label: 'Ticket',  logo: 'TKT', color: '#e8292b', active: false },
      { id: 'vr',     label: 'VR',      logo: 'VR',  color: '#e8292b', active: false },
    ],
  },
  {
    id: 'pix',
    label: 'Pix',
    detail: 'Pagamento instantaneo via chave Pix.',
  },
  {
    id: 'dinheiro',
    label: 'Dinheiro',
    detail: 'Recebimento direto no ato da entrega.',
  },
]

export function buildDefaultPaymentMethods(): PaymentMethodItem[] {
  return PAYMENT_METHOD_TEMPLATES.map((method) => ({
    id: method.id,
    label: method.label,
    detail: method.detail,
    active: false,
    brands: method.brands?.map((brand, index) => ({
      ...brand,
      active: index === 0 ? false : brand.active,
    })),
  }))
}

export function hasActivePaymentMethods(methods: PaymentMethodItem[]) {
  return methods.some((method) => method.active)
}
