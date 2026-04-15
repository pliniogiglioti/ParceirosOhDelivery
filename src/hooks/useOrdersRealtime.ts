import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { usePartnerDraftStore } from '@/hooks/usePartnerDraftStore'
import type { PartnerOrder, PartnerOrderItem, OrderStatus } from '@/types'

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

function rowToOrder(row: Record<string, unknown>, items: PartnerOrderItem[] = []): PartnerOrder {
  return {
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
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    items,
  }
}

export function useOrdersRealtime(storeId: string) {
  const { addOrder, updateOrder } = usePartnerDraftStore()

  useEffect(() => {
    if (!storeId || !supabase) return

    const channel = supabase
      .channel(`orders:store:${storeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        async (payload) => {
          const row = payload.new as Record<string, unknown>
          const orderId = String(row.id)

          const { data: itemRows } = await supabase!
            .from('order_items')
            .select('*')
            .eq('order_id', orderId)

          const items: PartnerOrderItem[] = (itemRows ?? []).map((item) => ({
            id: String(item.id),
            name: String(item.product_name ?? 'Produto'),
            quantity: Number(item.quantity ?? 0),
            unitPrice: Number(item.unit_price ?? 0),
            totalPrice: Number(item.total_price ?? 0),
          }))

          addOrder(storeId, rowToOrder(row, items))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>
          updateOrder(storeId, String(row.id), {
            status: mapStatus(row.status),
            paymentMethod: String(row.payment_method ?? 'Pix'),
          })
        }
      )
      .subscribe()

    return () => {
      void supabase!.removeChannel(channel)
    }
  }, [storeId, addOrder, updateOrder])
}
