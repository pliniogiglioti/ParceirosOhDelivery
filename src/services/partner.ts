import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { addRoleToProfile } from '@/services/profile'
import { isSameUtcDate } from '@/lib/utils'
import type {
  DeliveryArea,
  OrderStatus,
  PartnerCategory,
  PartnerDashboardData,
  PartnerHour,
  PartnerOrder,
  PartnerOrderItem,
  PartnerProduct,
  PartnerStoreCard,
  ReviewItem,
  StoreRegistrationInput,
} from '@/types'

const defaultPaymentMethods = [
  { id: 'pix', label: 'Pix', active: true, detail: 'Confirmacao instantanea' },
  { id: 'card', label: 'Cartao', active: true, detail: 'Credito e debito' },
  { id: 'cash', label: 'Dinheiro', active: true, detail: 'Troco configuravel ate R$ 100,00' },
]

function emptyDashboard(): PartnerDashboardData {
  return {
    store: {
      id: '',
      categoryName: '',
      name: 'Loja nao configurada',
      slug: '',
      tagline: '',
      description: '',
      accentColor: '#ea1d2c',
      deliveryFee: 0,
      minOrderAmount: 0,
      etaMin: 0,
      etaMax: 0,
      pickupEta: 0,
      rating: 0,
      reviewCount: 0,
      isOpen: false,
      active: false,
      isFeatured: false,
      tags: [],
      addressStreet: '',
      addressNeighborhood: '',
      addressCity: '',
      addressState: '',
      addressZip: '',
    },
    orders: [],
    categories: [],
    products: [],
    hours: [],
    deliveryAreas: [],
    paymentMethods: defaultPaymentMethods.map((method) => ({ ...method, active: false })),
    reviews: [],
    logistics: {
      averagePrepTime: '0 min',
      onTimeRate: '0%',
      courierMode: 'Nao configurado',
    },
    support: {
      openChats: 0,
      unreadMessages: 0,
      lastUpdateAt: new Date().toISOString(),
    },
    profile: {
      name: '',
      email: '',
      role: '',
    },
    metrics: {
      grossRevenue: 0,
      todayOrders: 0,
      averageTicket: 0,
      pendingOrders: 0,
    },
  }
}

function mapStatus(value: unknown): OrderStatus {
  const status = String(value ?? 'aguardando')

  if (
    status === 'aguardando' ||
    status === 'confirmado' ||
    status === 'preparo' ||
    status === 'a_caminho' ||
    status === 'entregue' ||
    status === 'cancelado'
  ) {
    return status
  }

  return 'aguardando'
}

function calculateMetrics(orders: PartnerOrder[]) {
  const today = new Date()
  const validOrders = orders.filter((order) => order.status !== 'cancelado')
  const todayOrders = validOrders.filter((order) => isSameUtcDate(order.createdAt, today))
  const grossRevenue = todayOrders.reduce((total, order) => total + order.total, 0)

  return {
    grossRevenue,
    todayOrders: todayOrders.length,
    averageTicket: todayOrders.length ? grossRevenue / todayOrders.length : 0,
    pendingOrders: orders.filter((order) =>
      ['aguardando', 'confirmado', 'preparo'].includes(order.status)
    ).length,
  }
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export async function getStoresByEmail(email: string): Promise<PartnerStoreCard[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, category_name, logo_image_url, is_open, active, slug, registration_status, rejection_reason')
    .eq('partner_email', email)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    categoryName: String(row.category_name ?? ''),
    logoImageUrl: row.logo_image_url ? String(row.logo_image_url) : undefined,
    isOpen: Boolean(row.is_open),
    active: Boolean(row.active),
    slug: String(row.slug),
    registrationStatus: (row.registration_status ?? 'pendente') as import('@/types').RegistrationStatus,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
  }))
}

export async function registerStore(
  input: StoreRegistrationInput,
  partnerId: string,
  partnerEmail: string,
  partnerName: string
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.')
  }

  const baseSlug = generateSlug(input.name)
  const slug = `${baseSlug}-${Date.now().toString(36)}`

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      name: input.name,
      cnpj: input.cnpj || null,
      slug,
      category_id: input.categoryId || null,
      category_name: input.categoryName,
      tagline: input.tagline,
      address_street: input.addressStreet,
      address_number: input.addressNumber,
      address_complement: input.addressComplement || null,
      address_neighborhood: input.addressNeighborhood,
      address_city: input.addressCity,
      address_state: input.addressState,
      address_zip: input.addressZip,
      lat: input.lat,
      lng: input.lng,
      delivery_fee: input.deliveryFee,
      eta_min: input.etaMin,
      eta_max: input.etaMax,
      pickup_eta: input.pickupEta,
      min_order_amount: input.minOrderAmount,
      partner_email: partnerEmail,
      partner_name: partnerName,
      is_open: false,
      active: false,
      registration_status: 'pendente',
    })
    .select('id')
    .single()

  if (error) throw error

  try {
    await addRoleToProfile(partnerId, 'store_owner')
  } catch {
    // Non-critical — store was created, role update failed silently
  }

  return String(store.id)
}

export async function loadPartnerDashboard(storeId: string): Promise<{
  data: PartnerDashboardData
  source: 'supabase'
}> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase nao configurado.')
  }

  const { data: storeRow, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('id', storeId)
    .single()

  if (storeError) {
    throw storeError
  }

  if (!storeRow) {
    return { data: emptyDashboard(), source: 'supabase' }
  }

  const [
    hourResult,
    categoryResult,
    productResult,
    orderResult,
    chatResult,
    deliveryAreaResult,
    reviewResult,
  ] = await Promise.all([
    supabase.from('store_hours').select('*').eq('store_id', storeRow.id).order('week_day', { ascending: true }),
    supabase
      .from('product_categories')
      .select('*')
      .eq('store_id', storeRow.id)
      .eq('active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('products').select('*').eq('store_id', storeRow.id).order('sort_order', { ascending: true }),
    supabase.from('orders').select('*').eq('store_id', storeRow.id).order('created_at', { ascending: false }).limit(8),
    supabase.from('chat_sessions').select('*').eq('store_id', storeRow.id).order('updated_at', { ascending: false }).limit(20),
    supabase.from('delivery_areas').select('*').eq('store_id', storeRow.id).order('sort_order', { ascending: true }),
    supabase.from('store_reviews').select('*').eq('store_id', storeRow.id).order('created_at', { ascending: false }).limit(50),
  ])

  const firstError =
    hourResult.error ??
    categoryResult.error ??
    productResult.error ??
    orderResult.error ??
    chatResult.error ??
    deliveryAreaResult.error ??
    reviewResult.error

  if (firstError) {
    throw firstError
  }

  const hourRows = hourResult.data
  const categoryRows = categoryResult.data
  const productRows = productResult.data
  const orderRows = orderResult.data
  const chatRows = chatResult.data
  const deliveryAreaRows = deliveryAreaResult.data
  const reviewRows = reviewResult.data

  const orderIds = (orderRows ?? []).map((row) => String(row.id))
  const chatIds = (chatRows ?? []).map((row) => String(row.id))

  const [{ data: orderItemRows }, { data: messageRows }] = await Promise.all([
    orderIds.length
      ? supabase.from('order_items').select('*').in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    chatIds.length
      ? supabase.from('chat_messages').select('*').in('chat_id', chatIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const itemCountByOrder = new Map<string, number>()
  const itemsByOrder = new Map<string, PartnerOrderItem[]>()

  ;(orderItemRows ?? []).forEach((row) => {
    const orderId = String(row.order_id)
    itemCountByOrder.set(orderId, (itemCountByOrder.get(orderId) ?? 0) + Number(row.quantity ?? 0))
    itemsByOrder.set(orderId, [
      ...(itemsByOrder.get(orderId) ?? []),
      {
        id: String(row.id),
        name: String(row.product_name ?? 'Produto'),
        quantity: Number(row.quantity ?? 0),
        unitPrice: Number(row.unit_price ?? 0),
        totalPrice: Number(row.total_price ?? 0),
      },
    ])
  })

  const categories: PartnerCategory[] =
    categoryRows?.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      icon: String(row.icon ?? 'MENU'),
      template: row.template === 'pizza' ? 'pizza' : 'padrao',
      sortOrder: Number(row.sort_order ?? 0),
      productCount: (productRows ?? []).filter((product) => String(product.category_id) === String(row.id)).length,
    })) ?? []

  const products: PartnerProduct[] =
    productRows?.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description ?? ''),
      categoryId: String(row.category_id ?? ''),
      price: Number(row.price ?? 0),
      imageUrl: row.image_url ? String(row.image_url) : undefined,
      stockQuantity: Number(row.stock_quantity ?? 0),
      active: Boolean(row.active ?? true),
      featured: Boolean(row.featured),
    })) ?? []

  const orders: PartnerOrder[] =
    orderRows?.map((row) => ({
      id: String(row.id),
      code: String(row.order_code ?? '#0000'),
      customerName: String(row.customer_name ?? 'Cliente'),
      status: mapStatus(row.status),
      total: Number(row.total_amount ?? 0),
      paymentMethod: String(row.payment_method ?? 'Pix'),
      fulfillmentType: String(row.fulfillment_type ?? 'delivery'),
      createdAt: String(row.created_at ?? new Date().toISOString()),
      itemsCount: itemCountByOrder.get(String(row.id)) ?? 0,
      items: itemsByOrder.get(String(row.id)) ?? [],
    })) ?? []

  const hours: PartnerHour[] =
    hourRows?.map((row) => ({
      id: String(row.id),
      weekDay: Number(row.week_day ?? 0),
      opensAt: String(row.opens_at ?? '18:00:00'),
      closesAt: String(row.closes_at ?? '23:00:00'),
      isClosed: Boolean(row.is_closed),
    })) ?? []

  const deliveryAreas: DeliveryArea[] =
    deliveryAreaRows?.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      etaLabel: String(row.eta_label ?? ''),
      fee: Number(row.fee ?? 0),
      active: Boolean(row.active ?? true),
    })) ?? []

  const reviews: ReviewItem[] =
    reviewRows?.map((row) => ({
      id: String(row.id),
      author: String(row.author_name ?? ''),
      rating: Number(row.rating ?? 0),
      comment: String(row.comment ?? ''),
      createdAt: String(row.created_at ?? ''),
    })) ?? []

  const availablePaymentMethods = Array.from(new Set(orders.map((order) => order.paymentMethod)))
  const deliveredOrders = orders.filter((order) => order.status === 'entregue')
  const onTimeRate = deliveredOrders.length
    ? Math.round((deliveredOrders.length / orders.filter((order) => order.status !== 'cancelado').length) * 100)
    : 0

  const data: PartnerDashboardData = {
    store: {
      id: String(storeRow.id),
      categoryName: String(storeRow.category_name ?? ''),
      name: String(storeRow.name),
      slug: String(storeRow.slug),
      tagline: String(storeRow.tagline ?? ''),
      description: String(storeRow.description_long ?? storeRow.description ?? ''),
      accentColor: String(storeRow.accent_color ?? '#ea1d2c'),
      deliveryFee: Number(storeRow.delivery_fee ?? 0),
      minOrderAmount: Number(storeRow.min_order_amount ?? 0),
      etaMin: Number(storeRow.eta_min ?? 20),
      etaMax: Number(storeRow.eta_max ?? 40),
      pickupEta: Number(storeRow.pickup_eta ?? storeRow.eta_min ?? 20),
      rating: Number(storeRow.rating ?? 4.8),
      reviewCount: Number(storeRow.review_count ?? 0),
      isOpen: Boolean(storeRow.is_open ?? true),
      active: Boolean(storeRow.active ?? true),
      isFeatured: Boolean(storeRow.is_featured ?? false),
      tags: Array.isArray(storeRow.tags) ? storeRow.tags.map((tag: unknown) => String(tag)) : [],
      coverImageUrl: storeRow.cover_image_url ? String(storeRow.cover_image_url) : undefined,
      logoImageUrl: storeRow.logo_image_url ? String(storeRow.logo_image_url) : undefined,
      addressStreet: String(storeRow.address_street ?? ''),
      addressNeighborhood: String(storeRow.address_neighborhood ?? ''),
      addressCity: String(storeRow.address_city ?? ''),
      addressState: String(storeRow.address_state ?? ''),
      addressZip: String(storeRow.address_zip ?? ''),
    },
    orders,
    categories,
    products,
    hours,
    deliveryAreas,
    paymentMethods: defaultPaymentMethods.map((method) => ({
      ...method,
      active: availablePaymentMethods.includes(method.label),
    })),
    reviews,
    logistics: {
      averagePrepTime: `${Math.max(Number(storeRow.eta_min ?? 0) - 4, 0)} min`,
      onTimeRate: `${onTimeRate}%`,
      courierMode: String(storeRow.logistics_courier_mode ?? 'Nao configurado'),
    },
    support: {
      openChats: chatRows?.length ?? 0,
      unreadMessages: (messageRows ?? []).filter((message) => String(message.sender) === 'user').length,
      lastUpdateAt: String(chatRows?.[0]?.updated_at ?? new Date().toISOString()),
    },
    profile: {
      name: String(storeRow.partner_name ?? ''),
      email: String(storeRow.partner_email ?? ''),
      role: String(storeRow.partner_role ?? ''),
    },
    metrics: calculateMetrics(orders),
  }

  return { data, source: 'supabase' }
}
