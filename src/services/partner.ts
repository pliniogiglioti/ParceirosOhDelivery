import { mockPartnerDashboard } from '@/data/mock'
import { isSupabaseConfigured, simulationModeEnabled, supabase } from '@/lib/supabase'
import { isSameUtcDate } from '@/lib/utils'
import type {
  DeliveryArea,
  OrderStatus,
  PartnerCategory,
  PartnerDashboardData,
  PartnerHour,
  PartnerOrder,
  PartnerProduct,
} from '@/types'

const defaultPaymentMethods = [
  { id: 'pix', label: 'Pix', active: true, detail: 'Confirmacao instantanea' },
  { id: 'card', label: 'Cartao', active: true, detail: 'Credito e debito' },
  { id: 'cash', label: 'Dinheiro', active: true, detail: 'Troco configuravel ate R$ 100,00' },
]

function fallbackDashboard(): PartnerDashboardData {
  return mockPartnerDashboard
}

function buildDeliveryAreas(baseFee: number, etaMin: number, etaMax: number): DeliveryArea[] {
  return [
    {
      id: 'dynamic-1',
      name: 'Centro',
      etaLabel: `${etaMin}-${etaMin + 5} min`,
      fee: Math.max(baseFee - 2, 0),
      active: true,
    },
    {
      id: 'dynamic-2',
      name: 'Regiao Norte',
      etaLabel: `${etaMin + 5}-${etaMax} min`,
      fee: baseFee,
      active: true,
    },
    {
      id: 'dynamic-3',
      name: 'Regiao Sul',
      etaLabel: `${etaMax}-${etaMax + 10} min`,
      fee: baseFee + 3,
      active: false,
    },
  ]
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

export async function loadPartnerDashboard(): Promise<{
  data: PartnerDashboardData
  source: 'supabase' | 'fallback'
}> {
  if (simulationModeEnabled || !isSupabaseConfigured || !supabase) {
    return { data: fallbackDashboard(), source: 'fallback' }
  }

  const { data: storeRows, error: storeError } = await supabase
    .from('stores')
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true })
    .limit(1)

  const storeRow = storeRows?.[0]

  if (storeError || !storeRow) {
    return { data: fallbackDashboard(), source: 'fallback' }
  }

  const [
    { data: hourRows },
    { data: categoryRows },
    { data: productRows },
    { data: orderRows },
    { data: chatRows },
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
  ])

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

  ;(orderItemRows ?? []).forEach((row) => {
    const orderId = String(row.order_id)
    itemCountByOrder.set(orderId, (itemCountByOrder.get(orderId) ?? 0) + Number(row.quantity ?? 0))
  })

  const categories: PartnerCategory[] =
    categoryRows?.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      icon: String(row.icon ?? 'MENU'),
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
    })) ?? []

  const hours: PartnerHour[] =
    hourRows?.map((row) => ({
      id: String(row.id),
      weekDay: Number(row.week_day ?? 0),
      opensAt: String(row.opens_at ?? '18:00:00'),
      closesAt: String(row.closes_at ?? '23:00:00'),
      isClosed: Boolean(row.is_closed),
    })) ?? mockPartnerDashboard.hours

  const availablePaymentMethods = Array.from(new Set(orders.map((order) => order.paymentMethod)))

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
      rating: Number(storeRow.rating ?? 4.8),
      reviewCount: Number(storeRow.review_count ?? 0),
      isOpen: Boolean(storeRow.is_open ?? true),
      active: Boolean(storeRow.active ?? true),
      isFeatured: Boolean(storeRow.is_featured ?? false),
      tags: Array.isArray(storeRow.tags) ? storeRow.tags.map((tag: unknown) => String(tag)) : [],
      coverImageUrl: storeRow.cover_image_url ? String(storeRow.cover_image_url) : undefined,
      logoImageUrl: storeRow.logo_image_url ? String(storeRow.logo_image_url) : undefined,
    },
    orders: orders.length ? orders : mockPartnerDashboard.orders,
    categories: categories.length ? categories : mockPartnerDashboard.categories,
    products: products.length ? products : mockPartnerDashboard.products,
    hours,
    deliveryAreas: buildDeliveryAreas(
      Number(storeRow.delivery_fee ?? 0),
      Number(storeRow.eta_min ?? 20),
      Number(storeRow.eta_max ?? 40)
    ),
    paymentMethods:
      availablePaymentMethods.length > 0
        ? defaultPaymentMethods.map((method) => ({
            ...method,
            active: availablePaymentMethods.includes(method.label),
          }))
        : defaultPaymentMethods,
    reviews: mockPartnerDashboard.reviews,
    logistics: {
      averagePrepTime: `${Math.max(Number(storeRow.eta_min ?? 20) - 4, 10)} min`,
      onTimeRate: '94%',
      courierMode: 'Operacao integrada ao marketplace',
    },
    support: {
      openChats: chatRows?.length ?? 0,
      unreadMessages: (messageRows ?? []).filter((message) => String(message.sender) === 'user').length,
      lastUpdateAt: String(chatRows?.[0]?.updated_at ?? new Date().toISOString()),
    },
    profile: {
      name: `${String(storeRow.name)} Partner`,
      email: `contato+${String(storeRow.slug)}@ohdelivery.local`,
      role: 'Gestor da operacao',
    },
    metrics: calculateMetrics(orders.length ? orders : mockPartnerDashboard.orders),
  }

  return { data, source: 'supabase' }
}
