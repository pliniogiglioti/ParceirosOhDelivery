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
    label: 'Cartao de Credito',
    detail: 'Selecione as bandeiras aceitas.',
    brands: [
      { id: 'visa', label: 'Visa', logo: 'VISA', color: '#1a1f71', active: false },
      { id: 'master', label: 'Mastercard', logo: 'MC', color: '#eb001b', active: false },
      { id: 'elo', label: 'Elo', logo: 'ELO', color: '#00a4e0', active: false },
      { id: 'amex', label: 'Amex', logo: 'AMEX', color: '#007bc1', active: false },
      { id: 'hipercard', label: 'Hipercard', logo: 'HIPER', color: '#b3131b', active: false },
    ],
  },
  {
    id: 'debito',
    label: 'Cartao de Debito',
    detail: 'Selecione as bandeiras aceitas.',
    brands: [
      { id: 'visa-electron', label: 'Visa Electron', logo: 'VISA', color: '#1a1f71', active: false },
      { id: 'maestro', label: 'Maestro', logo: 'MAE', color: '#eb001b', active: false },
      { id: 'elo-debito', label: 'Elo Debito', logo: 'ELO', color: '#00a4e0', active: false },
      { id: 'cabal', label: 'Cabal', logo: 'CAB', color: '#004a97', active: false },
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
  {
    id: 'vale',
    label: 'Vale-Alimentacao',
    detail: 'Selecione as bandeiras aceitas.',
    brands: [
      { id: 'ticket', label: 'Ticket', logo: 'TKT', color: '#e8292b', active: false },
      { id: 'sodexo', label: 'Sodexo', logo: 'SDX', color: '#e3051b', active: false },
      { id: 'alelo', label: 'Alelo', logo: 'ALE', color: '#00843d', active: false },
      { id: 'vr', label: 'VR', logo: 'VR', color: '#e8292b', active: false },
      { id: 'ben', label: 'Ben Visa Vale', logo: 'BEN', color: '#702f8a', active: false },
    ],
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
