import { useOutletContext } from 'react-router-dom'
import type { PartnerDashboardData } from '@/types'

export interface PartnerPageContext {
  data: PartnerDashboardData
  source: 'supabase' | 'fallback'
}

export function usePartnerPageData() {
  return useOutletContext<PartnerPageContext>()
}
