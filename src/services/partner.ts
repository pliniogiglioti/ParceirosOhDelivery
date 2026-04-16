import { isSupabaseConfigured, supabase } from '@/lib/supabase'
import { addRoleToProfile } from '@/services/profile'
import { isSameUtcDate } from '@/lib/utils'
import { buildDefaultPaymentMethods } from '@/lib/paymentMethods'
import type {
  DeliveryArea,
  LogisticsSnapshot,
  OrderStatus,
  OrderStatusEvent,
  PartnerCategory,
  PartnerDashboardData,
  PartnerHour,
  PartnerOrder,
  PartnerOrderItem,
  PartnerProduct,
  PartnerStoreCard,
  PaymentMethodItem,
  ReviewItem,
  StoreCourier,
  StoreRegistrationInput,
} from '@/types'

function emptyDashboard(): PartnerDashboardData {
  return {
    store: {
      id: '',
      firstAccess: false,
      contract: false,
      contractSignedAt: null,
      repassePercentual: 5,
      registrationStatus: 'pendente',
      rejectionReason: null,
      rejectedAt: null,
      reapplyAvailableAt: null,
      responsavelNome: '',
      responsavelCpf: '',
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
    paymentMethods: buildDefaultPaymentMethods(),
    couriers: [],
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

function mapStoreCard(row: Record<string, unknown>): PartnerStoreCard {
  return {
    id: String(row.id),
    firstAccess: Boolean(row.first_access ?? false),
    contract: Boolean(row.contract ?? false),
    name: String(row.name),
    categoryName: String(row.category_name ?? ''),
    logoImageUrl: row.logo_image_url ? String(row.logo_image_url) : undefined,
    isOpen: Boolean(row.is_open),
    active: Boolean(row.active),
    registrationStatus: (row.registration_status ?? 'pendente') as import('@/types').RegistrationStatus,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    rejectedAt: row.rejected_at ? String(row.rejected_at) : null,
    reapplyAvailableAt: row.reapply_available_at ? String(row.reapply_available_at) : null,
  }
}

export function isStoreReapplicationBlocked(store: Pick<PartnerStoreCard, 'registrationStatus' | 'reapplyAvailableAt'>) {
  if (store.registrationStatus !== 'rejeitado' || !store.reapplyAvailableAt) {
    return false
  }

  return new Date(store.reapplyAvailableAt).getTime() > Date.now()
}

export async function getLatestBlockedRejectedStore(email: string): Promise<PartnerStoreCard | null> {
  if (!isSupabaseConfigured || !supabase) {
    return null
  }

  const normalizedEmail = email.trim()

  const { data, error } = await supabase
    .from('stores')
    .select('id, first_access, contract, name, category_name, logo_image_url, is_open, active, registration_status, rejection_reason, rejected_at, reapply_available_at')
    .ilike('partner_email', normalizedEmail)
    .eq('registration_status', 'rejeitado')
    .gt('reapply_available_at', new Date().toISOString())
    .order('reapply_available_at', { ascending: false })
    .limit(1)

  if (error) throw error

  const blockedStore = data?.[0]
  return blockedStore ? mapStoreCard(blockedStore) : null
}

export async function getStoresByEmail(email: string): Promise<PartnerStoreCard[]> {
  if (!isSupabaseConfigured || !supabase) {
    return []
  }

  const normalizedEmail = email.trim()

  const { data, error } = await supabase
    .from('stores')
    .select('id, first_access, contract, name, category_name, logo_image_url, is_open, active, registration_status, rejection_reason, rejected_at, reapply_available_at')
    .ilike('partner_email', normalizedEmail)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map((row) => mapStoreCard(row))
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

  const blockedStore = await getLatestBlockedRejectedStore(partnerEmail)

  if (blockedStore) {
    throw new Error('Seu cadastro anterior nao foi aprovado. Tente novamente em 48 horas.')
  }

  const { data: store, error } = await supabase
    .from('stores')
    .insert({
      name: input.name,
      first_access: false,
      contract: false,
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

  if (error) {
    if (String(error.message).includes('REAPPLY_BLOCKED')) {
      throw new Error('Seu cadastro anterior nao foi aprovado. Tente novamente em 48 horas.')
    }

    throw error
  }

  try {
    await addRoleToProfile(partnerId, 'store_owner')
  } catch {
    // Non-critical — store was created, role update failed silently
  }

  return String(store.id)
}

export type StoreImageItem = {
  name: string
  path: string
  publicUrl: string
  updatedAt: string
}

export async function listStoreImages(storeId: string): Promise<StoreImageItem[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase.storage
    .from('store-images')
    .list(storeId, { sortBy: { column: 'updated_at', order: 'desc' } })

  if (error) throw error

  return (data ?? [])
    .filter((item) => item.id != null && !item.id.endsWith('/'))
    .map((item) => {
      const path = `${storeId}/${item.name}`
      const { data: urlData } = supabase!.storage.from('store-images').getPublicUrl(path)
      return {
        name: item.name,
        path,
        publicUrl: urlData.publicUrl,
        updatedAt: item.updated_at ?? '',
      }
    })
}

export async function uploadStoreImage(
  storeId: string,
  file: File
): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const ext = file.name.split('.').pop() ?? 'jpg'
  const ts = Date.now()
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/gi, '_').slice(0, 40)
  const path = `${storeId}/${baseName}_${ts}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('store-images')
    .upload(path, file, { upsert: false, contentType: file.type })

  if (uploadError) throw uploadError

  const { data } = supabase.storage.from('store-images').getPublicUrl(path)

  return data.publicUrl
}

export async function saveStore(storeId: string, patch: Partial<import('@/types').PartnerStore>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { error } = await supabase
    .from('stores')
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.firstAccess !== undefined && { first_access: patch.firstAccess }),
      ...(patch.contract !== undefined && { contract: patch.contract }),
      ...(patch.contract === true && { contract_signed_at: new Date().toISOString() }),
      ...(patch.repassePercentual !== undefined && { repasse_percentual: patch.repassePercentual }),
      ...(patch.categoryId !== undefined && { category_id: patch.categoryId }),
      ...(patch.categoryName !== undefined && { category_name: patch.categoryName }),
      ...(patch.description !== undefined && { description_long: patch.description }),
      ...(patch.deliveryFee !== undefined && { delivery_fee: patch.deliveryFee }),
      ...(patch.minOrderAmount !== undefined && { min_order_amount: patch.minOrderAmount }),
      ...(patch.etaMin !== undefined && { eta_min: patch.etaMin }),
      ...(patch.etaMax !== undefined && { eta_max: patch.etaMax }),
      ...(patch.pickupEta !== undefined && { pickup_eta: patch.pickupEta }),
      ...(patch.active !== undefined && { active: patch.active }),
      ...(patch.isOpen !== undefined && { is_open: patch.isOpen }),
      ...(patch.coverImageUrl !== undefined && { cover_image_url: patch.coverImageUrl }),
      ...(patch.logoImageUrl !== undefined && { logo_image_url: patch.logoImageUrl }),
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

export async function saveStorePaymentMethods(
  storeId: string,
  methods: PaymentMethodItem[]
): Promise<PaymentMethodItem[]> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const methodPayload = methods.map((method, index) => ({
    store_id: storeId,
    code: method.id,
    label: method.label,
    description: method.detail,
    active: method.active,
    sort_order: index,
    updated_at: new Date().toISOString(),
  }))

  const { error: methodError } = await supabase
    .from('store_payment_methods')
    .upsert(methodPayload, { onConflict: 'store_id,code' })

  if (methodError) throw methodError

  const { data: methodRows, error: fetchError } = await supabase
    .from('store_payment_methods')
    .select('id, code')
    .eq('store_id', storeId)
    .in('code', methods.map((m) => m.id))

  if (fetchError) throw fetchError

  const methodIdByCode = new Map<string, string>(
    (methodRows ?? []).map((row) => [String(row.code), String(row.id)])
  )

  const brandPayload = methods.flatMap((method) =>
    (method.brands ?? []).map((brand, index) => ({
      store_payment_method_id: methodIdByCode.get(method.id),
      code: brand.id,
      label: brand.label,
      logo: brand.logo,
      color: brand.color,
      active: brand.active,
      sort_order: index,
      updated_at: new Date().toISOString(),
    }))
  ).filter((brand): brand is {
    store_payment_method_id: string
    code: string
    label: string
    logo: string
    color: string
    active: boolean
    sort_order: number
    updated_at: string
  } => Boolean(brand.store_payment_method_id))

  if (brandPayload.length > 0) {
    const { error: brandError } = await supabase
      .from('store_payment_brands')
      .upsert(brandPayload, { onConflict: 'store_payment_method_id,code' })

    if (brandError) throw brandError
  }

  return methods
}

export async function saveStoreCourier(
  storeId: string,
  email: string
): Promise<StoreCourier> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const normalizedEmail = email.trim().toLowerCase()

  const { data, error } = await supabase
    .from('store_couriers')
    .upsert(
      {
        store_id: storeId,
        email: normalizedEmail,
        name: normalizedEmail.split('@')[0] ?? 'Entregador',
        status: 'pendente',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'store_id,email' }
    )
    .select('*')
    .single()

  if (error) throw error

  await updateStoreCourierMode(storeId, 'Entregadores proprios')

  return {
    id: String(data.id),
    email: String(data.email),
    name: String(data.name ?? normalizedEmail.split('@')[0] ?? 'Entregador'),
    status: (data.status ?? 'pendente') === 'ativo' ? 'ativo' : 'pendente',
    createdAt: String(data.created_at ?? new Date().toISOString()),
  }
}

export async function deleteStoreCourier(
  storeId: string,
  courierId: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { error } = await supabase
    .from('store_couriers')
    .delete()
    .eq('id', courierId)
    .eq('store_id', storeId)

  if (error) throw error

  const { count, error: countError } = await supabase
    .from('store_couriers')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)

  if (countError) throw countError

  await updateStoreCourierMode(storeId, (count ?? 0) > 0 ? 'Entregadores proprios' : 'Nao configurado')
}

export async function updateStoreCourierMode(
  storeId: string,
  courierMode: string
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { error } = await supabase
    .from('stores')
    .update({
      logistics_courier_mode: courierMode,
      updated_at: new Date().toISOString(),
    })
    .eq('id', storeId)

  if (error) throw error
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
      template: input.template ?? 'padrao',
      price_policy: (input as { pricePolicy?: string }).pricePolicy ?? 'maior',
      active: true,
      sort_order: 0,
    })
    .select('*')
    .single()

  if (error) throw error

  return {
    id: String(data.id),
    name: String(data.name),
    icon: String(data.icon ?? ''),
    template: data.template === 'pizza' ? 'pizza' : 'padrao',
    sortOrder: Number(data.sort_order ?? 0),
    productCount: 0,
    active: Boolean(data.active ?? true),
  }
}

export async function createProduct(
  storeId: string,
  input: {
    categoryId: string
    name: string
    description: string
    price: number
    compareAtPrice?: number | null
    imageUrl?: string
    manageStock?: boolean
    stockQuantity?: number | null
    gelada?: boolean
    active?: boolean
    featured?: boolean
    kind?: 'industrializado' | 'preparado'
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
      compare_at_price: input.compareAtPrice ?? null,
      image_url: input.imageUrl ?? null,
      manage_stock: input.manageStock ?? false,
      stock_quantity: input.stockQuantity ?? null,
      gelada: input.gelada ?? false,
      active: input.active ?? true,
      featured: input.featured ?? false,
      kind: input.kind ?? 'industrializado',
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
    compareAtPrice: data.compare_at_price === null ? null : Number(data.compare_at_price ?? 0),
    imageUrl: data.image_url ? String(data.image_url) : undefined,
    stockQuantity: data.stock_quantity === null ? null : Number(data.stock_quantity ?? 0),
    manageStock: Boolean(data.manage_stock ?? false),
    gelada: Boolean(data.gelada ?? false),
    active: Boolean(data.active ?? true),
    featured: Boolean(data.featured ?? false),
    kind: (data.kind === 'preparado' ? 'preparado' : 'industrializado') as 'industrializado' | 'preparado',
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

export async function updateProduct(
  productId: string,
  storeId: string,
  input: {
    name: string
    description: string
    price: number
    compareAtPrice?: number | null
    imageUrl?: string
    manageStock?: boolean
    stockQuantity?: number | null
    gelada?: boolean
    active?: boolean
    featured?: boolean
    categoryId?: string
  }
): Promise<PartnerProduct> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('products')
    .update({
      name: input.name,
      description: input.description,
      price: input.price,
      compare_at_price: input.compareAtPrice ?? null,
      image_url: input.imageUrl ?? null,
      manage_stock: input.manageStock ?? false,
      stock_quantity: input.stockQuantity ?? null,
      gelada: input.gelada ?? false,
      active: input.active ?? true,
      featured: input.featured ?? false,
      ...(input.categoryId ? { category_id: input.categoryId } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', productId)
    .eq('store_id', storeId)
    .select('*')
    .single()

  if (error) throw error

  return {
    id: String(data.id),
    name: String(data.name),
    description: String(data.description ?? ''),
    categoryId: String(data.category_id ?? ''),
    price: Number(data.price ?? 0),
    compareAtPrice: data.compare_at_price === null ? null : Number(data.compare_at_price ?? 0),
    imageUrl: data.image_url ? String(data.image_url) : undefined,
    stockQuantity: data.stock_quantity === null ? null : Number(data.stock_quantity ?? 0),
    manageStock: Boolean(data.manage_stock ?? false),
    gelada: Boolean(data.gelada ?? false),
    active: Boolean(data.active ?? true),
    featured: Boolean(data.featured ?? false),
    kind: (data.kind === 'preparado' ? 'preparado' : 'industrializado') as 'industrializado' | 'preparado',
  }
}

function statusEventLabel(status: OrderStatus): string {
  if (status === 'aguardando') return 'Pedido recebido'
  if (status === 'preparo') return 'Em preparo'
  if (status === 'confirmado') return 'Pronto'
  if (status === 'a_caminho') return 'Saiu para entrega'
  if (status === 'entregue') return 'Entregue'
  if (status === 'cancelado') return 'Cancelado'
  return status
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { error: orderError } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (orderError) throw orderError

  const { error: eventError } = await supabase
    .from('order_status_events')
    .insert({ order_id: orderId, status, label: statusEventLabel(status) })
  if (eventError) throw eventError
}

export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  if (!supabase) throw new Error('Supabase nao configurado.')
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'cancelado',
      cancellation_reason: reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId)
  if (error) throw error

  await supabase
    .from('order_status_events')
    .insert({ order_id: orderId, status: 'cancelado', label: 'Cancelado' })
}

export async function fetchOrderStatusEvents(orderId: string): Promise<OrderStatusEvent[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('order_status_events')
    .select('id, order_id, status, label, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: String(row.id),
    orderId: String(row.order_id),
    status: row.status as OrderStatus,
    label: String(row.label),
    createdAt: String(row.created_at),
  }))
}

// ── Complement Groups & Items ─────────────────────────────────────────────────

export interface ComplementLibraryItem {
  id: string
  name: string
  description: string
  price: number
  imageUrl?: string
}

export interface SavedComplementGroup {
  id: string
  name: string
  required: boolean
  minQty: number
  maxQty: number
}

export async function saveProductComplements(
  storeId: string,
  productId: string,
  groups: Array<{
    name: string
    required: boolean
    minQty: number
    maxQty: number
    items: Array<{
      source: 'biblioteca' | 'industrializado'
      name: string
      description: string
      price: number
      imageUrl?: string
      libraryItemId?: string
      industrializedId?: string
    }>
  }>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')
  if (groups.length === 0) return

  // Remove grupos antigos do produto (cascade apaga os itens)
  const { error: deleteError } = await supabase
    .from('product_complement_groups')
    .delete()
    .eq('product_id', productId)
    .eq('store_id', storeId)

  if (deleteError) {
    // Tabela ainda nao existe no banco (migration pendente) — ignora silenciosamente
    console.warn('[saveProductComplements] tabela nao encontrada, migration pendente:', deleteError.message)
    return
  }

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i]

    const { data: groupRow, error: groupError } = await supabase
      .from('product_complement_groups')
      .insert({
        product_id: productId,
        store_id: storeId,
        name: group.name,
        required: group.required,
        min_qty: group.minQty,
        max_qty: group.maxQty,
        sort_order: i,
      })
      .select('id')
      .single()

    if (groupError) throw groupError

    const groupId = String(groupRow.id)

    for (let j = 0; j < group.items.length; j++) {
      const item = group.items[j]
      const { error: itemError } = await supabase
        .from('product_complement_items')
        .insert({
          group_id: groupId,
          store_id: storeId,
          source: item.source,
          library_item_id: (item.libraryItemId && !item.libraryItemId.startsWith('lib-')) ? item.libraryItemId : null,
          industrialized_id: item.industrializedId ? Number(item.industrializedId) : null,
          name: item.name,
          description: item.description || null,
          price: item.price,
          image_url: item.imageUrl ?? null,
          sort_order: j,
        })
      if (itemError) throw itemError
    }
  }
}

export async function fetchProductComplements(productId: string): Promise<Array<{
  id: string
  name: string
  required: boolean
  minQty: number
  maxQty: number
  items: Array<{
    id: string
    name: string
    description: string
    price: number
    source: 'biblioteca' | 'industrializado'
    imageUrl?: string
  }>
}>> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data: groups, error: groupsError } = await supabase
    .from('product_complement_groups')
    .select('id, name, required, min_qty, max_qty, sort_order')
    .eq('product_id', productId)
    .order('sort_order', { ascending: true })

  if (groupsError) {
    console.warn('[fetchProductComplements]', groupsError.message)
    return []
  }
  if (!groups || groups.length === 0) return []

  const groupIds = groups.map((g) => String(g.id))

  const { data: items, error: itemsError } = await supabase
    .from('product_complement_items')
    .select('id, group_id, name, description, price, source, image_url, sort_order')
    .in('group_id', groupIds)
    .order('sort_order', { ascending: true })

  if (itemsError) {
    console.warn('[fetchProductComplements items]', itemsError.message)
  }

  return groups.map((g) => ({
    id: String(g.id),
    name: String(g.name),
    required: Boolean(g.required),
    minQty: Number(g.min_qty ?? 0),
    maxQty: Number(g.max_qty ?? 1),
    items: (items ?? [])
      .filter((i) => String(i.group_id) === String(g.id))
      .map((i) => ({
        id: String(i.id),
        name: String(i.name),
        description: String(i.description ?? ''),
        price: Number(i.price ?? 0),
        source: (i.source === 'industrializado' ? 'industrializado' : 'biblioteca') as 'biblioteca' | 'industrializado',
        imageUrl: i.image_url ? String(i.image_url) : undefined,
      })),
  }))
}

export async function fetchComplementLibrary(storeId: string): Promise<ComplementLibraryItem[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data, error } = await supabase
    .from('complement_library')
    .select('id, name, description, price, image_url')
    .eq('store_id', storeId)
    .eq('active', true)
    .order('name')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    price: Number(row.price ?? 0),
    imageUrl: row.image_url ? String(row.image_url) : undefined,
  }))
}

export async function createComplementLibraryItem(
  storeId: string,
  input: { name: string; description?: string; price: number; imageUrl?: string }
): Promise<ComplementLibraryItem> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('complement_library')
    .insert({
      store_id: storeId,
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      image_url: input.imageUrl ?? null,
    })
    .select('id, name, description, price, image_url')
    .single()

  if (error) throw error

  return {
    id: String(data.id),
    name: String(data.name),
    description: String(data.description ?? ''),
    price: Number(data.price ?? 0),
    imageUrl: data.image_url ? String(data.image_url) : undefined,
  }
}

export async function updateComplementLibraryItem(
  itemId: string,
  storeId: string,
  input: { name: string; description?: string; price: number; imageUrl?: string }
): Promise<ComplementLibraryItem> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { data, error } = await supabase
    .from('complement_library')
    .update({
      name: input.name,
      description: input.description ?? null,
      price: input.price,
      image_url: input.imageUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('store_id', storeId)
    .select('id, name, description, price, image_url')
    .single()

  if (error) throw error

  return {
    id: String(data.id),
    name: String(data.name),
    description: String(data.description ?? ''),
    price: Number(data.price ?? 0),
    imageUrl: data.image_url ? String(data.image_url) : undefined,
  }
}

export async function deleteComplementLibraryItem(itemId: string, storeId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')
  const { error } = await supabase
    .from('complement_library')
    .delete()
    .eq('id', itemId)
    .eq('store_id', storeId)
  if (error) throw error
}

export async function savePizzaFlavor(
  storeId: string,
  input: {
    id?: string
    categoryId: string
    name: string
    description: string
    imageUrl?: string
    active?: boolean
    featured?: boolean
    prices: Record<string, number> // sizeId -> price
  }
): Promise<import('@/types').PizzaFlavor> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  let flavorId: string

  if (input.id) {
    const { data, error } = await supabase
      .from('pizza_flavors')
      .update({
        name: input.name,
        description: input.description || null,
        image_url: input.imageUrl ?? null,
        active: input.active ?? true,
        featured: input.featured ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)
      .eq('store_id', storeId)
      .select('id')
      .single()
    if (error) throw error
    flavorId = String(data.id)
  } else {
    const { data, error } = await supabase
      .from('pizza_flavors')
      .insert({
        category_id: input.categoryId,
        store_id: storeId,
        name: input.name,
        description: input.description || null,
        image_url: input.imageUrl ?? null,
        active: input.active ?? true,
        featured: input.featured ?? false,
      })
      .select('id')
      .single()
    if (error) throw error
    flavorId = String(data.id)
  }

  // Upsert prices
  const priceRows = Object.entries(input.prices).map(([sizeId, price]) => ({
    flavor_id: flavorId,
    size_id: sizeId,
    store_id: storeId,
    price,
  }))

  if (priceRows.length > 0) {
    const { error } = await supabase
      .from('pizza_flavor_prices')
      .upsert(priceRows, { onConflict: 'flavor_id,size_id' })
    if (error) throw error
  }

  return {
    id: flavorId,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    imageUrl: input.imageUrl,
    active: input.active ?? true,
    featured: input.featured ?? false,
    prices: input.prices,
  }
}

export async function fetchPizzaFlavors(categoryId: string): Promise<import('@/types').PizzaFlavor[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data: flavors, error } = await supabase
    .from('pizza_flavors')
    .select('id, category_id, name, description, image_url, active, featured')
    .eq('category_id', categoryId)
    .order('sort_order')
  if (error) { console.warn('[fetchPizzaFlavors]', error.message); return [] }
  if (!flavors?.length) return []

  const flavorIds = flavors.map((f) => String(f.id))
  const { data: prices } = await supabase
    .from('pizza_flavor_prices')
    .select('flavor_id, size_id, price')
    .in('flavor_id', flavorIds)

  return flavors.map((f) => ({
    id: String(f.id),
    categoryId: String(f.category_id),
    name: String(f.name),
    description: String(f.description ?? ''),
    imageUrl: f.image_url ? String(f.image_url) : undefined,
    active: Boolean(f.active ?? true),
    featured: Boolean(f.featured ?? false),
    prices: Object.fromEntries(
      (prices ?? []).filter((p) => String(p.flavor_id) === String(f.id))
        .map((p) => [String(p.size_id), Number(p.price ?? 0)])
    ),
  }))
}

export async function savePizzaCategory(
  storeId: string,
  categoryId: string,
  sizes: Array<{
    id?: string
    name: string
    slices: number
    maxFlavors: number
    sortOrder: number
    crusts: Array<{ id?: string; name: string; price: number }>
    edges: Array<{ id?: string; name: string; price: number }>
  }>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  // Delete all existing sizes (cascade deletes crusts and edges)
  await supabase.from('pizza_sizes').delete().eq('category_id', categoryId).eq('store_id', storeId)

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i]
    const { data: sizeRow, error: sizeError } = await supabase
      .from('pizza_sizes')
      .insert({
        category_id: categoryId,
        store_id: storeId,
        name: size.name,
        slices: size.slices,
        max_flavors: size.maxFlavors,
        sort_order: i,
      })
      .select('id')
      .single()
    if (sizeError) throw sizeError

    const sizeId = String(sizeRow.id)

    for (let j = 0; j < size.crusts.length; j++) {
      const crust = size.crusts[j]
      if (!crust.name.trim()) continue
      const { error } = await supabase.from('pizza_crusts').insert({
        size_id: sizeId, store_id: storeId,
        name: crust.name, price: crust.price, sort_order: j,
      })
      if (error) throw error
    }

    for (let j = 0; j < size.edges.length; j++) {
      const edge = size.edges[j]
      if (!edge.name.trim()) continue
      const { error } = await supabase.from('pizza_edges').insert({
        size_id: sizeId, store_id: storeId,
        name: edge.name, price: edge.price, sort_order: j,
      })
      if (error) throw error
    }
  }
}

export async function fetchPizzaSizes(categoryId: string): Promise<import('@/types').PizzaSize[]> {
  if (!isSupabaseConfigured || !supabase) return []

  const { data: sizes, error } = await supabase
    .from('pizza_sizes')
    .select('id, category_id, name, slices, max_flavors, sort_order')
    .eq('category_id', categoryId)
    .order('sort_order')
  if (error) { console.warn('[fetchPizzaSizes]', error.message); return [] }
  if (!sizes?.length) return []

  const sizeIds = sizes.map((s) => String(s.id))
  const [{ data: crusts }, { data: edges }] = await Promise.all([
    supabase.from('pizza_crusts').select('id, size_id, name, price, sort_order').in('size_id', sizeIds).order('sort_order'),
    supabase.from('pizza_edges').select('id, size_id, name, price, sort_order').in('size_id', sizeIds).order('sort_order'),
  ])

  return sizes.map((s) => ({
    id: String(s.id),
    categoryId: String(s.category_id),
    name: String(s.name),
    slices: Number(s.slices ?? 8),
    maxFlavors: (Number(s.max_flavors ?? 1)) as 1 | 2 | 3 | 4,
    sortOrder: Number(s.sort_order ?? 0),
    crusts: (crusts ?? []).filter((c) => String(c.size_id) === String(s.id)).map((c) => ({
      id: String(c.id), sizeId: String(c.size_id), name: String(c.name), price: Number(c.price ?? 0),
    })),
    edges: (edges ?? []).filter((e) => String(e.size_id) === String(s.id)).map((e) => ({
      id: String(e.id), sizeId: String(e.size_id), name: String(e.name), price: Number(e.price ?? 0),
    })),
  }))
}

export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase nao configurado.')

  const { error } = await supabase
    .from('store_reviews')
    .update({
      owner_reply: reply.trim() || null,
      owner_replied_at: reply.trim() ? new Date().toISOString() : null,
    })
    .eq('id', reviewId)

  if (error) throw error
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
    paymentMethodResult,
    courierResult,
  ] = await Promise.all([
    supabase.from('store_hours').select('*').eq('store_id', storeRow.id).order('week_day', { ascending: true }),
    supabase
      .from('product_categories')
      .select('*')
      .eq('store_id', storeRow.id)
      .order('sort_order', { ascending: true }),
    supabase.from('products').select('*').eq('store_id', storeRow.id).order('sort_order', { ascending: true }),
    supabase.from('orders').select('*').eq('store_id', storeRow.id).order('created_at', { ascending: false }),
    supabase.from('chat_sessions').select('*').eq('store_id', storeRow.id).order('updated_at', { ascending: false }).limit(20),
    supabase.from('delivery_areas').select('*').eq('store_id', storeRow.id).order('sort_order', { ascending: true }),
    supabase.from('store_reviews').select('*').eq('store_id', storeRow.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('store_payment_methods').select('*').eq('store_id', storeRow.id).order('sort_order', { ascending: true }),
    supabase.from('store_couriers').select('*').eq('store_id', storeRow.id).order('created_at', { ascending: false }),
  ])

  const firstError =
    hourResult.error ??
    categoryResult.error ??
    productResult.error ??
    orderResult.error ??
    chatResult.error ??
    deliveryAreaResult.error ??
    paymentMethodResult.error ??
    courierResult.error

  if (firstError) {
    throw firstError
  }

  const hourRows = hourResult.data
  const categoryRows = categoryResult.data
  const productRows = productResult.data
  const orderRows = orderResult.data
  const chatRows = chatResult.data
  const deliveryAreaRows = deliveryAreaResult.data
  const reviewRows = reviewResult.error ? [] : reviewResult.data
  const paymentMethodRows = paymentMethodResult.data
  const courierRows = courierResult.data

  const orderIds = (orderRows ?? []).map((row) => String(row.id))
  const chatIds = (chatRows ?? []).map((row) => String(row.id))

  const paymentMethodIds = (paymentMethodRows ?? []).map((row) => String(row.id))

  const [{ data: orderItemRows }, { data: messageRows }, { data: paymentBrandRows }] = await Promise.all([
    orderIds.length
      ? supabase.from('order_items').select('*').in('order_id', orderIds)
      : Promise.resolve({ data: [], error: null }),
    chatIds.length
      ? supabase.from('chat_messages').select('*').in('chat_id', chatIds)
      : Promise.resolve({ data: [], error: null }),
    paymentMethodIds.length
      ? supabase.from('store_payment_brands').select('*').in('store_payment_method_id', paymentMethodIds)
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
      active: Boolean(row.active ?? true),
    })) ?? []

  const products: PartnerProduct[] =
    productRows?.map((row) => ({
      id: String(row.id),
      name: String(row.name),
      description: String(row.description ?? ''),
      categoryId: String(row.category_id ?? ''),
      price: Number(row.price ?? 0),
      compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price ?? 0),
      imageUrl: row.image_url ? String(row.image_url) : undefined,
      stockQuantity: row.stock_quantity === null ? null : Number(row.stock_quantity ?? 0),
      manageStock: Boolean(row.manage_stock ?? false),
      gelada: Boolean(row.gelada ?? false),
      active: Boolean(row.active ?? true),
      featured: Boolean(row.featured),
      kind: (row.kind === 'preparado' ? 'preparado' : 'industrializado') as 'industrializado' | 'preparado',
    })) ?? []

  const orders: PartnerOrder[] =
    orderRows?.map((row) => ({
      id: String(row.id),
      code: String(row.order_code ?? '#0000'),
      customerName: String(row.customer_name ?? 'Cliente'),
      customerProfileId: row.profile_id ? String(row.profile_id) : null,
      customerEmail: row.customer_email ? String(row.customer_email) : null,
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
      ownerReply: row.owner_reply ? String(row.owner_reply) : null,
      ownerRepliedAt: row.owner_replied_at ? String(row.owner_replied_at) : null,
    })) ?? []

  const brandRowsByMethodId = new Map<string, Array<Record<string, unknown>>>()

  ;(paymentBrandRows ?? []).forEach((row) => {
    const methodId = String(row.store_payment_method_id)
    brandRowsByMethodId.set(methodId, [...(brandRowsByMethodId.get(methodId) ?? []), row])
  })

  const paymentMethods: PaymentMethodItem[] =
    paymentMethodRows && paymentMethodRows.length > 0
      ? paymentMethodRows.map((row) => ({
          id: String(row.code ?? row.id),
          label: String(row.label ?? ''),
          detail: String(row.description ?? ''),
          active: Boolean(row.active ?? false),
          brands: (brandRowsByMethodId.get(String(row.id)) ?? [])
            .sort((left, right) => Number(left.sort_order ?? 0) - Number(right.sort_order ?? 0))
            .map((brandRow) => ({
              id: String(brandRow.code ?? brandRow.id),
              label: String(brandRow.label ?? ''),
              logo: String(brandRow.logo ?? ''),
              color: String(brandRow.color ?? '#1f2937'),
              active: Boolean(brandRow.active ?? false),
            })),
        }))
      : buildDefaultPaymentMethods()

  const couriers: StoreCourier[] =
    courierRows?.map((row) => ({
      id: String(row.id),
      email: String(row.email ?? ''),
      name: String(row.name ?? row.email ?? 'Entregador'),
      status: (row.status ?? 'pendente') === 'ativo' ? 'ativo' : 'pendente',
      createdAt: String(row.created_at ?? new Date().toISOString()),
    })) ?? []

  const deliveredOrders = orders.filter((order) => order.status === 'entregue')
  const onTimeRate = deliveredOrders.length
    ? Math.round((deliveredOrders.length / orders.filter((order) => order.status !== 'cancelado').length) * 100)
    : 0

  const logistics: LogisticsSnapshot = {
    averagePrepTime: `${Math.max(Number(storeRow.eta_min ?? 0) - 4, 0)} min`,
    onTimeRate: `${onTimeRate}%`,
    courierMode:
      couriers.length > 0
        ? 'Entregadores proprios'
        : String(storeRow.logistics_courier_mode ?? 'Nao configurado'),
  }

  const data: PartnerDashboardData = {
    store: {
      id: String(storeRow.id),
      firstAccess: Boolean(storeRow.first_access ?? false),
      contract: Boolean(storeRow.contract ?? false),
      contractSignedAt: storeRow.contract_signed_at ? String(storeRow.contract_signed_at) : null,
      repassePercentual: Number(storeRow.repasse_percentual ?? 5),
      registrationStatus: (storeRow.registration_status ?? 'pendente') as import('@/types').RegistrationStatus,
      rejectionReason: storeRow.rejection_reason ? String(storeRow.rejection_reason) : null,
      rejectedAt: storeRow.rejected_at ? String(storeRow.rejected_at) : null,
      reapplyAvailableAt: storeRow.reapply_available_at ? String(storeRow.reapply_available_at) : null,
      responsavelNome: String(storeRow.responsavel_nome ?? ''),
      responsavelCpf: String(storeRow.responsavel_cpf ?? ''),
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
    paymentMethods,
    couriers,
    reviews,
    logistics,
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
