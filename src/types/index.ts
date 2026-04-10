export type OrderStatus =
  | 'aguardando'
  | 'confirmado'
  | 'preparo'
  | 'a_caminho'
  | 'entregue'
  | 'cancelado'

export type PartnerSection =
  | 'inicio'
  | 'pedidos'
  | 'financeiro'
  | 'cardapio'
  | 'areas'
  | 'logistica'
  | 'horarios'
  | 'pagamentos'
  | 'avaliacoes'
  | 'marketing'
  | 'suporte'
  | 'loja'
  | 'perfil'
  | 'configuracoes'
  | 'mensagens'
  | 'notificacoes'

export interface PartnerStore {
  id: string
  categoryName: string
  name: string
  slug: string
  tagline: string
  description: string
  accentColor: string
  deliveryFee: number
  minOrderAmount: number
  etaMin: number
  etaMax: number
  pickupEta: number
  rating: number
  reviewCount: number
  isOpen: boolean
  active: boolean
  isFeatured: boolean
  tags: string[]
  coverImageUrl?: string
  logoImageUrl?: string
}

export interface PartnerOrder {
  id: string
  code: string
  customerName: string
  status: OrderStatus
  total: number
  paymentMethod: string
  fulfillmentType: string
  createdAt: string
  itemsCount: number
  items?: PartnerOrderItem[]
  stageStartedAt?: string
}

export interface PartnerOrderItem {
  id: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface PartnerCategory {
  id: string
  name: string
  icon: string
  template?: 'padrao' | 'pizza'
  sortOrder: number
  productCount: number
}

export interface PartnerProduct {
  id: string
  name: string
  description: string
  categoryId: string
  price: number
  imageUrl?: string
  stockQuantity: number
  active: boolean
  featured: boolean
}

export interface PartnerHour {
  id: string
  weekDay: number
  opensAt: string
  closesAt: string
  isClosed: boolean
}

export type SoundModel = 'balcao' | 'chime' | 'ding' | 'melodia' | 'alerta' | 'sirene' | 'critico'

export interface PartnerOrderSettings {
  acceptTime: number
  prepareTime: number
  playSound: boolean
  playLateOrderSound: boolean
  lateOrderSoundModel: SoundModel
  soundModel: SoundModel
  showNotification: boolean
  printAutomatically: boolean
  acceptAutomatically: boolean
}

export interface DeliveryArea {
  id: string
  name: string
  etaLabel: string
  fee: number
  active: boolean
}

export interface PaymentMethodItem {
  id: string
  label: string
  active: boolean
  detail: string
}

export interface ReviewItem {
  id: string
  author: string
  rating: number
  comment: string
  createdAt: string
}

export interface LogisticsSnapshot {
  averagePrepTime: string
  onTimeRate: string
  courierMode: string
}

export interface SupportSnapshot {
  openChats: number
  unreadMessages: number
  lastUpdateAt: string
}

export interface PartnerProfile {
  name: string
  email: string
  role: string
}

export interface PartnerMetrics {
  grossRevenue: number
  todayOrders: number
  averageTicket: number
  pendingOrders: number
}

export interface PartnerAuthUser {
  email: string
  name: string
}

export interface PartnerDashboardData {
  store: PartnerStore
  orders: PartnerOrder[]
  categories: PartnerCategory[]
  products: PartnerProduct[]
  hours: PartnerHour[]
  deliveryAreas: DeliveryArea[]
  paymentMethods: PaymentMethodItem[]
  reviews: ReviewItem[]
  logistics: LogisticsSnapshot
  support: SupportSnapshot
  profile: PartnerProfile
  metrics: PartnerMetrics
}
