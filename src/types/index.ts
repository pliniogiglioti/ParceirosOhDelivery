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
  firstAccess: boolean
  categoryId: string
  categoryName: string
  name: string
  description: string
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
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressNeighborhood: string
  addressCity: string
  addressState: string
  addressZip: string
  lat: number | null
  lng: number | null
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
  compareAtPrice: number | null
  imageUrl?: string
  stockQuantity: number | null
  manageStock: boolean
  gelada: boolean
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

export interface PaymentBrandItem {
  id: string
  label: string
  logo: string
  color: string
  active: boolean
}

export interface PaymentMethodItem {
  id: string
  label: string
  active: boolean
  detail: string
  brands?: PaymentBrandItem[]
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

export interface StoreCourier {
  id: string
  email: string
  name: string
  status: 'ativo' | 'pendente'
  createdAt: string
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
  id: string
  email: string
  name: string
}

export type UserRole = 'customer' | 'store_owner' | 'delivery'

export interface Profile {
  id: string
  email: string
  name: string | null
  phone: string | null
  avatarUrl: string | null
  roles: UserRole[]
  createdAt: string
}

export interface StoreCategory {
  id: string
  name: string
  icon: string
}

export type RegistrationStatus = 'pendente' | 'aprovado' | 'rejeitado'

export interface PartnerStoreCard {
  id: string
  firstAccess: boolean
  name: string
  categoryName: string
  logoImageUrl?: string
  isOpen: boolean
  active: boolean
  registrationStatus: RegistrationStatus
  rejectionReason: string | null
}

export interface StoreRegistrationInput {
  name: string
  cnpj: string
  razaoSocial: string
  nomeFantasia: string
  responsavelNome: string
  responsavelCpf: string
  categoryId: string
  categoryName: string
  addressStreet: string
  addressNumber: string
  addressComplement: string
  addressNeighborhood: string
  addressCity: string
  addressState: string
  addressZip: string
  lat: number | null
  lng: number | null
  deliveryFee: number
  etaMin: number
  etaMax: number
  pickupEta: number
  minOrderAmount: number
}

export interface PartnerDashboardData {
  store: PartnerStore
  orders: PartnerOrder[]
  categories: PartnerCategory[]
  products: PartnerProduct[]
  hours: PartnerHour[]
  deliveryAreas: DeliveryArea[]
  paymentMethods: PaymentMethodItem[]
  couriers: StoreCourier[]
  reviews: ReviewItem[]
  logistics: LogisticsSnapshot
  support: SupportSnapshot
  profile: PartnerProfile
  metrics: PartnerMetrics
}
