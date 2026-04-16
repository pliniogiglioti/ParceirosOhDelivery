import { isSupabaseConfigured, supabase } from '@/lib/supabase'

export type FunnelEventType = 'visita' | 'visualizacao' | 'sacola' | 'revisao' | 'venda'

export interface FunnelData {
  visita: number
  visualizacao: number
  sacola: number
  revisao: number
  venda: number
  conversionRate: number
}

export type PeriodFilter = 'hoje' | '7dias' | '30dias' | 'personalizado'

function getDateRange(period: PeriodFilter, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date()
  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  if (period === 'hoje') {
    const from = new Date(now)
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (period === '7dias') {
    const from = new Date(now)
    from.setDate(from.getDate() - 6)
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  if (period === '30dias') {
    const from = new Date(now)
    from.setDate(from.getDate() - 29)
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }

  // personalizado
  return {
    from: customFrom ? new Date(customFrom).toISOString() : new Date(now.setDate(now.getDate() - 29)).toISOString(),
    to: customTo ? new Date(customTo + 'T23:59:59').toISOString() : to.toISOString(),
  }
}

export async function fetchFunnelData(
  storeId: string,
  period: PeriodFilter,
  customFrom?: string,
  customTo?: string
): Promise<FunnelData> {
  if (!isSupabaseConfigured || !supabase) {
    return { visita: 0, visualizacao: 0, sacola: 0, revisao: 0, venda: 0, conversionRate: 0 }
  }

  const { from, to } = getDateRange(period, customFrom, customTo)

  const { data, error } = await supabase
    .from('store_funnel_events')
    .select('event_type')
    .eq('store_id', storeId)
    .gte('created_at', from)
    .lte('created_at', to)

  if (error) throw error

  const counts: Record<FunnelEventType, number> = {
    visita: 0,
    visualizacao: 0,
    sacola: 0,
    revisao: 0,
    venda: 0,
  }

  ;(data ?? []).forEach((row) => {
    const type = row.event_type as FunnelEventType
    if (type in counts) counts[type]++
  })

  const conversionRate = counts.visita > 0
    ? Math.round((counts.venda / counts.visita) * 100 * 10) / 10
    : 0

  return { ...counts, conversionRate }
}
