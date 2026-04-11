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
      firstAccess: false,
      categoryId: '',
      categoryName: '',
      name: 'Loja nao configurada',
      description: '',
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
      addressNumber: '',
      addressComplement: '',
      addressNeighborhood: '',
      addressCity: '',
      addressState: '',
      addressZip: '',
      lat: null,
      lng: null,
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

export async function getStoresByEmail(email: string): Promise<PartnerStoreCard[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const normalizedEmail = email.trim()

  const { data, error } = await supabase
    .from('stores')
    .select('id, first_access, name, category_name, logo_image_url, is_open, active, registration_status, rejection_reason')
    .ilike('partner_email', normalizedEmail)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    firstAccess: Boolean(row.first_access ?? false),
    name: String(row.name),
    categoryName: String(row.category_name ?? ''),
    logoImageUrl: row.logo_image_url ? String(row.logo_image_url) : undefined,
    isOpen: Boolean(row.is_open),
    active: Boolean(row.active),
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

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      name: input.name,
      first_access: false,
      cnpj: input.cnpj || null,
      razao_social: input.razaoSocial || null,
      nome_fantasia: input.nomeFantasia || null,
      responsavel_nome: input.responsavelNome || null,
      responsavel_cpf: input.responsavelCpf || null,
      category_id: input.categoryId || null,
      category_name: input.categoryName,
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

export async function saveStore(storeId: string, patch: Partial<import('@/types').PartnerStore>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { error } = await supabase
    .from('stores')
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.firstAccess !== undefined && { first_access: patch.firstAccess }),
      ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
      ...(patch.categoryName !== undefined && { category_name: patch.categoryName }),
      ...(patch.description !== undefined && { description_long: patch.description }),
      ...(patch.deliveryFee !== undefined && { delivery_fee: patch.deliveryFee }),
      ...(patch.minOrderAmount !== undefined && { min_order_amount: patch.minOrderAmount }),
      ...(patch.etaMin !== undefined && { eta_min: patch.etaMin }),
      ...(patch.etaMax !== undefined && { eta_max: patch.etaMax }),
      ...(patch.pickupEta !== undefined && { pickup_eta: patch.pickupEta }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.addressStreet !== undefined && { address_street: patch.addressStreet }),
      ...(patch.addressNumber !== undefined && { address_number: patch.addressNumber }),
      ...(patch.addressComplement !== undefined && { address_complement: patch.addressComplement }),
      ...(patch.addressNeighborhood !== undefined && { address_neighborhood: patch.addressNeighborhood }),
      ...(patch.addressCity !== undefined && { address_city: patch.addressCity }),
      ...(patch.addressState !== undefined && { address_state: patch.addressState }),
      ...(patch.addressZip !== undefined && { address_zip: patch.addressZip }),
      ...(patch.lat !== undefined && { lat: patch.lat }),
      ...(patch.lng !== undefined && { lng: patch.lng }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)

  if (error) throw error
}

export async function initializeStoreHours(storeId: string): Promise<PartnerHour[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const rows = Array.from({ length: 7 }, (_, weekDay) => ({
    store_id: storeId,
    week_day: weekDay,
    opens_at: '08:00:00',
    closes_at: '22:00:00',
    is_closed: weekDay === 0,
  }))

  const { data, error } = await supabase.from('store_hours').insert(rows).select('*')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    weekDay: Number(row.week_day),
    opensAt: String(row.opens_at),
    closesAt: String(row.closes_at),
    isClosed: Boolean(row.is_closed),
  }))
}

export async function saveStoreHours(
  storeId: string,
  hours: Array<Pick<PartnerHour, 'id' | 'opensAt' | 'closesAt' | 'isClosed'>>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')
  const client = supabase

  const results = await Promise.all(
    hours.map((hour) =>
      client
        .from('store_hours')
        .update({
          opens_at: hour.opensAt,
          closes_at: hour.closesAt,
          is_closed: hour.isClosed,
        })
        .eq('id', hour.id)
        .eq('store_id', storeId)
    )
  )

  const firstError = results.find((result) => result.error)?.error

  if (firstError) throw firstError
}

export async function saveDeliveryArea(
  storeId: string,
  area: {
    id?: string
    name: string
    etaLabel: string
    fee: number
    active: boolean
  }
): Promise<DeliveryArea> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const payload = {
    name: area.name,
    eta_label: area.etaLabel,
    fee: area.fee,
    active: area.active,
    updated_at: new Date().toISOString(),
  }

  const query = area.id
    ? supabase
        .from('delivery_areas')
        .update(payload)
        .eq('id', area.id)
        .eq('store_id', storeId)
    : supabase
        .from('delivery_areas')
        .insert({
          store_id: storeId,
          ...payload,
          sort_order: 0,
        })

  const { data, error } = await query.select('*').single()

  if (error) throw error

  return {
    id: String(data.id),
    name: String(data.name),
    etaLabel: String(data.eta_label ?? ''),
    fee: Number(data.fee ?? 0),
    active: Boolean(data.active ?? true),
  }
}

export async function createProductCategory(
  storeId: string,
  input: {
    name: string
    icon?: string
    template?: 'padrao' | 'pizza'
  }
): Promise<PartnerCategory> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('product_categories')
    .insert({
      store_id: storeId,
      name: input.name,
      icon: input.icon ?? 'MENU',
      active: true,
      sort_order: 0,
    })
    .select('*')
    .single()

  if (error) throw error

  return {
    id: String(data.id),
    name: String(data.name),
    icon: String(data.icon ?? 'MENU'),
    template: input.template === 'pizza' ? 'pizza' : 'padrao',
    sortOrder: Number(data.sort_order ?? 0),
    productCount: 0,
  }
}

export async function createProduct(
  storeId: string,
  input: {
    categoryId: string
    name: string
    description: string
    price: number
    imageUrl?: string
  }
): Promise<PartnerProduct> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('products')
    .insert({
      store_id: storeId,
      category_id: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      image_url: input.imageUrl ?? null,
      stock_quantity: 100,
      active: true,
      featured: false,
      sort_order: 0,
    })
    .select('*')
    .single()

  if (error) throw error

  return {
    id: String(data.id),
    name: String(data.name),
    description: String(data.description ?? ''),
    categoryId: String(data.category_id ?? ''),
    price: Number(data.price ?? 0),
    imageUrl: data.image_url ? String(data.image_url) : undefined,
    stockQuantity: Number(data.stock_quantity ?? 0),
    active: Boolean(data.active ?? true),
    featured: Boolean(data.featured ?? false),
  }
}

export type IndustrializedItem = {
  id: string
  name: string
  brand: string
  ean: string
  description: string
  image: string
}

export async function fetchIndustrializados(): Promise<IndustrializedItem[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('industrializados')
    .select('id, name, brand, ean, description, image_url')
    .eq('active', true)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    brand: String(row.brand),
    ean: String(row.ean),
    description: String(row.description ?? ''),
    image: String(row.image_url ?? ''),
  }))
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
      firstAccess: Boolean(storeRow.first_access ?? false),
      categoryId: String(storeRow.category_id ?? ''),
      categoryName: String(storeRow.category_name ?? ''),
      name: String(storeRow.name),
      description: String(storeRow.description_long ?? storeRow.description ?? ''),
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
      addressNumber: String(storeRow.address_number ?? ''),
      addressComplement: String(storeRow.address_complement ?? ''),
      addressNeighborhood: String(storeRow.address_neighborhood ?? ''),
      addressCity: String(storeRow.address_city ?? ''),
      addressState: String(storeRow.address_state ?? ''),
      addressZip: String(storeRow.address_zip ?? ''),
      lat: storeRow.lat != null ? Number(storeRow.lat) : null,
      lng: storeRow.lng != null ? Number(storeRow.lng) : null,
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
