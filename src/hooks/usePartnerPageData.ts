import { useOutletContext } from 'react-router-dom'
import type { PartnerDashboardData } from '@/types'

export interface PartnerPageContext {
  data: PartnerDashboardData
  serverData: PartnerDashboardData
  source: 'supabase'
}

export function usePartnerPageData() {
  return useOutletContext<PartnerPageContext>()
}

export function usePartnerPageDataSafe() {
  return useOutletContext<PartnerPageContext | null>()
}
